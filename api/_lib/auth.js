import { randomBytes, scryptSync, timingSafeEqual, createHmac } from "node:crypto";

const COOKIE_NAME = "sesion";
const SESION_DURACION_SEGUNDOS = 60 * 60 * 24 * 7; // 7 días

export const ROLES_VALIDOS = ["admin", "reclutador"];

// Sin letras/números ambiguos (0/O, 1/l/I) para que se puedan dictar o
// transcribir por WhatsApp sin errores.
const ALFABETO_PASSWORD_TEMPORAL = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";

// Contraseña temporal para el reseteo manual por un admin (ver
// api/usuarios/[id].js): la persona la usa una sola vez y el login la obliga
// a cambiarla de inmediato (ver debeCambiarPassword).
export function generarPasswordTemporal(longitud = 10) {
  const bytes = randomBytes(longitud);
  let resultado = "";
  for (let i = 0; i < longitud; i++) {
    resultado += ALFABETO_PASSWORD_TEMPORAL[bytes[i] % ALFABETO_PASSWORD_TEMPORAL.length];
  }
  return resultado;
}

function secreto() {
  if (!process.env.SESSION_SECRET) {
    throw new Error("Falta SESSION_SECRET (configúralo en .env.local y en Vercel)");
  }
  return process.env.SESSION_SECRET;
}

// Hash de contraseña con scrypt (nativo de Node, sin dependencias externas).
// Formato guardado: "salt:hash", ambos en hex.
export function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verificarPassword(password, almacenado) {
  const [salt, hashGuardado] = (almacenado || "").split(":");
  if (!salt || !hashGuardado) return false;

  const hash = scryptSync(password, salt, 64);
  const hashGuardadoBuffer = Buffer.from(hashGuardado, "hex");
  if (hash.length !== hashGuardadoBuffer.length) return false;
  return timingSafeEqual(hash, hashGuardadoBuffer);
}

// Token de sesión: payload en base64url + firma HMAC-SHA256, sin librerías de
// JWT. Se guarda en una cookie httpOnly, nunca en localStorage (no lo toca JS
// del navegador, así que no es robable por XSS).
export function crearTokenSesion(usuario) {
  const payload = JSON.stringify({
    uid: usuario._id.toString(),
    nombre: usuario.nombre,
    email: usuario.email,
    // Cuentas creadas antes de que existiera este campo se tratan como admin,
    // para no dejar afuera a nadie que ya tenía acceso total.
    rol: usuario.rol || "admin",
    debeCambiarPassword: Boolean(usuario.debeCambiarPassword),
    exp: Date.now() + SESION_DURACION_SEGUNDOS * 1000,
  });
  const payloadB64 = Buffer.from(payload).toString("base64url");
  const firma = createHmac("sha256", secreto()).update(payloadB64).digest("base64url");
  return `${payloadB64}.${firma}`;
}

function verificarTokenSesion(token) {
  if (!token) return null;
  const [payloadB64, firma] = token.split(".");
  if (!payloadB64 || !firma) return null;

  const firmaEsperada = createHmac("sha256", secreto()).update(payloadB64).digest("base64url");
  const firmaBuf = Buffer.from(firma);
  const esperadaBuf = Buffer.from(firmaEsperada);
  if (firmaBuf.length !== esperadaBuf.length || !timingSafeEqual(firmaBuf, esperadaBuf)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString());
    if (typeof payload.exp !== "number" || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

function leerCookie(request, nombre) {
  const header = request.headers.cookie;
  if (!header) return null;
  for (const parte of header.split(";")) {
    const igual = parte.indexOf("=");
    if (igual === -1) continue;
    const clave = parte.slice(0, igual).trim();
    if (clave === nombre) return decodeURIComponent(parte.slice(igual + 1).trim());
  }
  return null;
}

// "Secure" solo aplica en producción (Vercel siempre sirve por HTTPS). En
// desarrollo local por IP de red (ej. abrir el dashboard desde el celular vía
// http://192.168.x.x:5174 para probar el diseño responsivo) el navegador
// descarta en silencio cualquier cookie "Secure" que llegue por HTTP —el
// login parece funcionar pero la cookie nunca se guarda, y la siguiente
// petición da 401. Por localhost no pasa porque los navegadores tratan
// localhost como contexto seguro incluso sin HTTPS.
const ES_PRODUCCION = Boolean(process.env.VERCEL);

export function escribirCookieSesion(response, token) {
  const atributos = [
    `${COOKIE_NAME}=${token}`,
    "HttpOnly",
    "SameSite=Lax",
    "Path=/",
    `Max-Age=${SESION_DURACION_SEGUNDOS}`,
  ];
  if (ES_PRODUCCION) atributos.push("Secure");
  response.setHeader("Set-Cookie", atributos.join("; "));
}

export function borrarCookieSesion(response) {
  const atributos = [`${COOKIE_NAME}=`, "HttpOnly", "SameSite=Lax", "Path=/", "Max-Age=0"];
  if (ES_PRODUCCION) atributos.push("Secure");
  response.setHeader("Set-Cookie", atributos.join("; "));
}

// Exige sesión válida. Si no la hay, ya responde 401 y devuelve null — el
// handler que llama solo tiene que hacer `if (!usuario) return;`.
export function requireAuth(request, response) {
  const token = leerCookie(request, COOKIE_NAME);
  const payload = verificarTokenSesion(token);
  if (!payload) {
    response.status(401).json({ error: "No autenticado." });
    return null;
  }
  return {
    id: payload.uid,
    nombre: payload.nombre,
    email: payload.email,
    rol: payload.rol || "admin",
    debeCambiarPassword: Boolean(payload.debeCambiarPassword),
  };
}

// Igual que requireAuth, pero además exige rol "admin". Se usa en las
// acciones que solo debe poder hacer el equipo de administración del
// dashboard: agregar/gestionar gente y borrar vacantes.
export function requireAdmin(request, response) {
  const usuario = requireAuth(request, response);
  if (!usuario) return null;
  if (usuario.rol !== "admin") {
    response.status(403).json({ error: "Necesitas permisos de administrador para esto." });
    return null;
  }
  return usuario;
}
