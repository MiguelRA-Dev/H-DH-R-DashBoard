import { randomBytes, scryptSync, timingSafeEqual, createHmac } from "node:crypto";

const COOKIE_NAME = "sesion";
const SESION_DURACION_SEGUNDOS = 60 * 60 * 24 * 7; // 7 días

// Sesión de superadmin: completamente aparte de la de un usuario normal (otra
// cookie, no lleva organizacionId) porque abre TODAS las organizaciones, no
// una sola — nunca debe poder confundirse con una sesión de tenant. Duración
// corta a propósito, es una herramienta operativa, no algo que se deja
// abierto en una pestaña días enteros.
const COOKIE_SUPERADMIN = "sesion_superadmin";
const SUPERADMIN_DURACION_SEGUNDOS = 60 * 60 * 12; // 12 horas

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
    // A qué organización pertenece — todas las consultas de la API filtran por
    // esto, es lo que separa los datos de un cliente de los de otro.
    organizacionId: usuario.organizacionId?.toString(),
    debeCambiarPassword: Boolean(usuario.debeCambiarPassword),
    // Cuentas creadas antes de que existiera este campo (o la migración de
    // licencias por usuario, ver scripts/migrar-licencias-asignadas.js) se
    // tratan como licenciadas, para no dejar a nadie sin acceso de la nada.
    licenciaAsignada: usuario.licenciaAsignada !== false,
    exp: Date.now() + SESION_DURACION_SEGUNDOS * 1000,
  });
  const payloadB64 = Buffer.from(payload).toString("base64url");
  const firma = createHmac("sha256", secreto()).update(payloadB64).digest("base64url");
  return `${payloadB64}.${firma}`;
}

// Verifica firma + expiración de cualquier token con esta forma (payload en
// base64url + firma HMAC) — lo usan tanto la sesión normal como la de
// superadmin, cada una interpretando el payload a su manera.
function verificarTokenFirmado(token) {
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
  const payload = verificarTokenFirmado(token);
  if (!payload) {
    response.status(401).json({ error: "No autenticado." });
    return null;
  }
  // Token de una sesión anterior a que existiera organizacionId: nunca lo
  // dejamos pasar como si fuera válido. `new ObjectId(undefined)` no revienta
  // — genera un id nuevo y aleatorio cada vez, así que un organizacionId
  // ausente terminaría creando/buscando datos bajo una organización fantasma
  // distinta en cada petición, en silencio. Mejor forzar un login nuevo.
  if (!payload.organizacionId) {
    response.status(401).json({ error: "Tu sesión es antigua, vuelve a iniciar sesión." });
    return null;
  }
  return {
    id: payload.uid,
    nombre: payload.nombre,
    email: payload.email,
    rol: payload.rol || "admin",
    organizacionId: payload.organizacionId,
    debeCambiarPassword: Boolean(payload.debeCambiarPassword),
    licenciaAsignada: payload.licenciaAsignada !== false,
  };
}

// Igual que requireAuth, pero además exige que la cuenta tenga una licencia
// asignada (ver organizacion.licencias y usuarios.licenciaAsignada) — sin
// esto, un admin puede crear tantas cuentas como quiera (ver api/usuarios),
// pero solo las licenciadas pueden de verdad usar la plataforma. Login,
// logout y cambiar contraseña quedan afuera de esto a propósito: alguien sin
// licencia todavía necesita poder enterarse, cerrar sesión o arreglar su
// contraseña (ver api/auth/*).
export function requireLicencia(request, response) {
  const usuario = requireAuth(request, response);
  if (!usuario) return null;
  if (!usuario.licenciaAsignada) {
    response.status(403).json({
      error: "Tu cuenta no tiene una licencia asignada. Contacta a un administrador de tu organización.",
    });
    return null;
  }
  return usuario;
}

// Igual que requireLicencia, pero además exige rol "admin". Se usa en las
// acciones que solo debe poder hacer el equipo de administración del
// dashboard: agregar/gestionar gente, licencias y borrar vacantes.
export function requireAdmin(request, response) {
  const usuario = requireLicencia(request, response);
  if (!usuario) return null;
  if (usuario.rol !== "admin") {
    response.status(403).json({ error: "Necesitas permisos de administrador para esto." });
    return null;
  }
  return usuario;
}

// ---------- Superadmin (fuera de cualquier organización) ----------

// Sin usuario/contraseña por correo: es una sola contraseña compartida en una
// variable de entorno (SUPERADMIN_PASSWORD), igual de simple que los scripts
// de CLI que reemplaza (crear-organizacion.js, reset-admin-password.js) —
// no hay un equipo de superadmins, es quien opera la plataforma.
export function verificarPasswordSuperadmin(password) {
  const esperado = process.env.SUPERADMIN_PASSWORD;
  if (!esperado || !password) return false;
  const a = Buffer.from(password);
  const b = Buffer.from(esperado);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function crearTokenSuperadmin() {
  const payload = JSON.stringify({
    superadmin: true,
    exp: Date.now() + SUPERADMIN_DURACION_SEGUNDOS * 1000,
  });
  const payloadB64 = Buffer.from(payload).toString("base64url");
  const firma = createHmac("sha256", secreto()).update(payloadB64).digest("base64url");
  return `${payloadB64}.${firma}`;
}

export function escribirCookieSuperadmin(response, token) {
  const atributos = [
    `${COOKIE_SUPERADMIN}=${token}`,
    "HttpOnly",
    "SameSite=Lax",
    "Path=/",
    `Max-Age=${SUPERADMIN_DURACION_SEGUNDOS}`,
  ];
  if (ES_PRODUCCION) atributos.push("Secure");
  response.setHeader("Set-Cookie", atributos.join("; "));
}

export function borrarCookieSuperadmin(response) {
  const atributos = [`${COOKIE_SUPERADMIN}=`, "HttpOnly", "SameSite=Lax", "Path=/", "Max-Age=0"];
  if (ES_PRODUCCION) atributos.push("Secure");
  response.setHeader("Set-Cookie", atributos.join("; "));
}

// Exige sesión de superadmin válida. Deliberadamente SIN relación con
// requireAuth/requireAdmin: una sesión de tenant nunca debe servir acá, ni
// viceversa — son dos cookies y dos payloads distintos.
export function requireSuperAdmin(request, response) {
  const token = leerCookie(request, COOKIE_SUPERADMIN);
  const payload = verificarTokenFirmado(token);
  if (!payload || payload.superadmin !== true) {
    response.status(401).json({ error: "No autenticado como superadmin." });
    return null;
  }
  return true;
}
