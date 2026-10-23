import { describe, test, expect, beforeEach } from "vitest";
import { createHmac } from "node:crypto";
import {
  hashPassword,
  verificarPassword,
  crearTokenSesion,
  escribirCookieSesion,
  requireAuth,
  requireLicencia,
  requireAdmin,
  verificarPasswordSuperadmin,
  crearTokenSuperadmin,
  requireSuperAdmin,
  generarPasswordTemporal,
} from "./auth.js";

function crearResponseFake() {
  const headers = {};
  return {
    headers,
    statusCode: null,
    body: null,
    setHeader(nombre, valor) {
      headers[nombre] = valor;
    },
    status(codigo) {
      this.statusCode = codigo;
      return this;
    },
    json(cuerpo) {
      this.body = cuerpo;
      return this;
    },
  };
}

// Mismo camino que un request real: crearTokenSesion -> escribirCookieSesion
// -> parsear el Set-Cookie resultante -> armar el header Cookie de la
// siguiente petición. Así cada test ejercita la firma/verificación real, no
// un atajo que la esquive.
function tokenComoCookie(token) {
  const atributos = `sesion=${token}; HttpOnly`;
  const valor = atributos.split(";")[0];
  return { headers: { cookie: valor } };
}

const USUARIO_BASE = {
  _id: { toString: () => "usr_1" },
  nombre: "Ana Admin",
  email: "ana@empresa.com",
  rol: "admin",
  organizacionId: { toString: () => "org_1" },
  debeCambiarPassword: false,
  licenciaAsignada: true,
};

describe("hashPassword / verificarPassword", () => {
  test("una contraseña correcta verifica true", () => {
    const hash = hashPassword("ClaveSegura123");
    expect(verificarPassword("ClaveSegura123", hash)).toBe(true);
  });

  test("una contraseña incorrecta verifica false", () => {
    const hash = hashPassword("ClaveSegura123");
    expect(verificarPassword("OtraClave456", hash)).toBe(false);
  });

  test("dos hashes de la misma contraseña son distintos (salt al azar)", () => {
    expect(hashPassword("misma")).not.toBe(hashPassword("misma"));
  });

  test("verificarPassword no revienta con un valor almacenado vacío o corrupto", () => {
    expect(verificarPassword("cualquiera", "")).toBe(false);
    expect(verificarPassword("cualquiera", "sin-dos-puntos")).toBe(false);
    expect(verificarPassword("cualquiera", undefined)).toBe(false);
  });
});

describe("generarPasswordTemporal", () => {
  test("no usa caracteres ambiguos (0/O, 1/l/I)", () => {
    for (let i = 0; i < 50; i++) {
      const pass = generarPasswordTemporal();
      expect(pass).not.toMatch(/[01OlI]/);
    }
  });

  test("respeta la longitud pedida", () => {
    expect(generarPasswordTemporal(12)).toHaveLength(12);
  });
});

describe("requireAuth / requireLicencia / requireAdmin", () => {
  beforeEach(() => {
    process.env.SESSION_SECRET = "secreto-de-pruebas";
  });

  test("sin cookie, requireAuth responde 401 y devuelve null", () => {
    const response = crearResponseFake();
    const resultado = requireAuth({ headers: {} }, response);
    expect(resultado).toBeNull();
    expect(response.statusCode).toBe(401);
  });

  test("con un token válido, requireAuth devuelve los datos del usuario", () => {
    const token = crearTokenSesion(USUARIO_BASE);
    const request = tokenComoCookie(token);
    const response = crearResponseFake();

    const usuario = requireAuth(request, response);
    expect(usuario).toMatchObject({
      id: "usr_1",
      nombre: "Ana Admin",
      rol: "admin",
      organizacionId: "org_1",
      licenciaAsignada: true,
    });
    expect(response.statusCode).toBeNull();
  });

  test("un token con firma alterada no pasa", () => {
    const token = crearTokenSesion(USUARIO_BASE);
    const tokenAlterado = token.slice(0, -2) + "xx";
    const response = crearResponseFake();

    expect(requireAuth(tokenComoCookie(tokenAlterado), response)).toBeNull();
    expect(response.statusCode).toBe(401);
  });

  test("un token firmado con otro SESSION_SECRET no pasa", () => {
    const token = crearTokenSesion(USUARIO_BASE);
    process.env.SESSION_SECRET = "otro-secreto-distinto";
    const response = crearResponseFake();

    expect(requireAuth(tokenComoCookie(token), response)).toBeNull();
    expect(response.statusCode).toBe(401);
  });

  test("un token sin organizacionId (sesión vieja) se rechaza con mensaje propio", () => {
    const usuarioSinOrg = { ...USUARIO_BASE, organizacionId: undefined };
    const token = crearTokenSesion(usuarioSinOrg);
    const response = crearResponseFake();

    expect(requireAuth(tokenComoCookie(token), response)).toBeNull();
    expect(response.statusCode).toBe(401);
    expect(response.body.error).toMatch(/antigua/i);
  });

  test("un token expirado no pasa", () => {
    // Fabricamos el token a mano para poder forzar un exp ya vencido —
    // crearTokenSesion siempre pone la expiración real a 7 días.
    const payload = JSON.stringify({
      uid: "usr_1",
      nombre: "Ana",
      email: "ana@empresa.com",
      rol: "admin",
      organizacionId: "org_1",
      debeCambiarPassword: false,
      licenciaAsignada: true,
      exp: Date.now() - 1000,
    });
    const payloadB64 = Buffer.from(payload).toString("base64url");
    const firma = createHmac("sha256", process.env.SESSION_SECRET).update(payloadB64).digest("base64url");
    const token = `${payloadB64}.${firma}`;
    const response = crearResponseFake();

    expect(requireAuth(tokenComoCookie(token), response)).toBeNull();
    expect(response.statusCode).toBe(401);
  });

  test("requireLicencia rechaza con 403 a un usuario sin licencia asignada", () => {
    const sinLicencia = { ...USUARIO_BASE, licenciaAsignada: false };
    const token = crearTokenSesion(sinLicencia);
    const response = crearResponseFake();

    expect(requireLicencia(tokenComoCookie(token), response)).toBeNull();
    expect(response.statusCode).toBe(403);
  });

  test("requireLicencia deja pasar a un usuario licenciado", () => {
    const token = crearTokenSesion(USUARIO_BASE);
    const response = crearResponseFake();

    expect(requireLicencia(tokenComoCookie(token), response)).not.toBeNull();
  });

  test("requireAdmin rechaza con 403 a un reclutador licenciado (no es admin)", () => {
    const reclutador = { ...USUARIO_BASE, rol: "reclutador" };
    const token = crearTokenSesion(reclutador);
    const response = crearResponseFake();

    expect(requireAdmin(tokenComoCookie(token), response)).toBeNull();
    expect(response.statusCode).toBe(403);
  });

  test("requireAdmin rechaza con 403 (no 401) a un admin sin licencia, antes de llegar al chequeo de rol", () => {
    const adminSinLicencia = { ...USUARIO_BASE, rol: "admin", licenciaAsignada: false };
    const token = crearTokenSesion(adminSinLicencia);
    const response = crearResponseFake();

    expect(requireAdmin(tokenComoCookie(token), response)).toBeNull();
    expect(response.statusCode).toBe(403);
    expect(response.body.error).toMatch(/licencia/i);
  });

  test("requireAdmin deja pasar a un admin licenciado", () => {
    const token = crearTokenSesion(USUARIO_BASE);
    const response = crearResponseFake();

    const usuario = requireAdmin(tokenComoCookie(token), response);
    expect(usuario).not.toBeNull();
    expect(usuario.rol).toBe("admin");
  });
});

describe("escribirCookieSesion", () => {
  test("pone HttpOnly, SameSite=Lax y el Max-Age de 7 días", () => {
    const response = crearResponseFake();
    escribirCookieSesion(response, "token-de-prueba");
    const cookie = response.headers["Set-Cookie"];
    expect(cookie).toContain("sesion=token-de-prueba");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toContain(`Max-Age=${60 * 60 * 24 * 7}`);
    // Sin VERCEL=1 (desarrollo local), nunca debe llevar Secure — si lo
    // llevara, Chrome descarta la cookie en http://192.168.x.x y el login
    // local por red queda roto en silencio (ya pasó una vez esta sesión).
    expect(cookie).not.toContain("Secure");
  });
});

describe("superadmin", () => {
  beforeEach(() => {
    process.env.SESSION_SECRET = "secreto-de-pruebas";
    process.env.SUPERADMIN_PASSWORD = "clave-superadmin";
  });

  test("verificarPasswordSuperadmin acepta la contraseña correcta y rechaza cualquier otra", () => {
    expect(verificarPasswordSuperadmin("clave-superadmin")).toBe(true);
    expect(verificarPasswordSuperadmin("otra-cosa")).toBe(false);
    expect(verificarPasswordSuperadmin("")).toBe(false);
  });

  test("requireSuperAdmin acepta un token de superadmin válido", () => {
    const token = crearTokenSuperadmin();
    const response = crearResponseFake();
    const request = { headers: { cookie: `sesion_superadmin=${token}` } };

    expect(requireSuperAdmin(request, response)).toBe(true);
  });

  test("un token de sesión normal (de tenant) no sirve como sesión de superadmin", () => {
    const tokenTenant = crearTokenSesion(USUARIO_BASE);
    const response = crearResponseFake();
    // Mandado en la cookie que requireSuperAdmin realmente lee.
    const request = { headers: { cookie: `sesion_superadmin=${tokenTenant}` } };

    expect(requireSuperAdmin(request, response)).toBeNull();
    expect(response.statusCode).toBe(401);
  });
});
