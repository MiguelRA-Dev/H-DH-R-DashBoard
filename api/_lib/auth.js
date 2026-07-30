import { randomBytes, scryptSync, timingSafeEqual, createHmac } from "node:crypto";

const COOKIE_NAME = "sesion";
const SESION_DURACION_SEGUNDOS = 60 * 60 * 24 * 7; // 7 días

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

export function escribirCookieSesion(response, token) {
  response.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${SESION_DURACION_SEGUNDOS}`
  );
}

export function borrarCookieSesion(response) {
  response.setHeader("Set-Cookie", `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`);
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
  return { id: payload.uid, nombre: payload.nombre, email: payload.email };
}
