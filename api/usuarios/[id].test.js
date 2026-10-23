import { describe, test, expect, vi, beforeEach } from "vitest";

const findOneMock = vi.fn();
const findOneAndUpdateMock = vi.fn();
const countDocumentsMock = vi.fn();
const usuariosColeccionMock = {
  findOne: findOneMock,
  findOneAndUpdate: findOneAndUpdateMock,
  countDocuments: countDocumentsMock,
};

const organizacionFindOneMock = vi.fn();
const organizacionesColeccionMock = { findOne: organizacionFindOneMock };

vi.mock("../_lib/mongodb.js", () => ({
  getUsuariosCollection: vi.fn(async () => usuariosColeccionMock),
  getOrganizacionesCollection: vi.fn(async () => organizacionesColeccionMock),
}));

const requireAdminMock = vi.fn();
vi.mock("../_lib/auth.js", () => ({
  requireAdmin: (...args) => requireAdminMock(...args),
  hashPassword: (password) => `hash(${password})`,
}));

const { default: handler } = await import("./[id].js");

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

const ADMIN = { id: "admin_1", rol: "admin", organizacionId: "68f0000000000000000000a1" };
const ID_VALIDO = "68f0000000000000000000b2";

function peticion(body) {
  return {
    method: "PATCH",
    headers: {},
    query: { id: ID_VALIDO },
    body,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  requireAdminMock.mockReturnValue(ADMIN);
});

describe("resetPassword", () => {
  test("rechaza una contraseña de menos de 8 caracteres sin tocar la base", async () => {
    const response = crearResponseFake();
    await handler(peticion({ accion: "resetPassword", nuevaPassword: "corta" }), response);

    expect(response.statusCode).toBe(400);
    expect(findOneAndUpdateMock).not.toHaveBeenCalled();
  });

  test("con una contraseña válida, hashea y guarda sin dejarla marcada como temporal", async () => {
    findOneAndUpdateMock.mockResolvedValue({ _id: ID_VALIDO, nombre: "Pepe" });
    const response = crearResponseFake();
    await handler(peticion({ accion: "resetPassword", nuevaPassword: "ClaveNueva2026" }), response);

    expect(response.statusCode).toBe(200);
    const [, cambios] = findOneAndUpdateMock.mock.calls[0];
    expect(cambios.$set.passwordHash).toBe("hash(ClaveNueva2026)");
    expect(cambios.$set.debeCambiarPassword).toBe(false);
  });

  test("404 si el usuario no existe (o es de otra organización)", async () => {
    findOneAndUpdateMock.mockResolvedValue(null);
    const response = crearResponseFake();
    await handler(peticion({ accion: "resetPassword", nuevaPassword: "ClaveNueva2026" }), response);

    expect(response.statusCode).toBe(404);
  });
});

describe("asignarLicencia", () => {
  test("403 cuando el cupo del rol ya está lleno", async () => {
    findOneMock.mockResolvedValue({ _id: ID_VALIDO, rol: "reclutador", licenciaAsignada: false });
    organizacionFindOneMock.mockResolvedValue({ licencias: { admin: 2, reclutador: 3 } });
    countDocumentsMock.mockResolvedValue(3); // ya hay 3 de 3 licenciados

    const response = crearResponseFake();
    await handler(peticion({ accion: "asignarLicencia" }), response);

    expect(response.statusCode).toBe(403);
    expect(findOneAndUpdateMock).not.toHaveBeenCalled();
  });

  test("asigna la licencia y guarda licenciaAsignadaEn cuando hay cupo libre", async () => {
    findOneMock.mockResolvedValue({ _id: ID_VALIDO, rol: "reclutador", licenciaAsignada: false });
    organizacionFindOneMock.mockResolvedValue({ licencias: { admin: 2, reclutador: 3 } });
    countDocumentsMock.mockResolvedValue(2); // 2 de 3, hay cupo
    findOneAndUpdateMock.mockResolvedValue({ _id: ID_VALIDO, licenciaAsignada: true });

    const response = crearResponseFake();
    await handler(peticion({ accion: "asignarLicencia" }), response);

    expect(response.statusCode).toBe(200);
    const [, cambios] = findOneAndUpdateMock.mock.calls[0];
    expect(cambios.$set.licenciaAsignada).toBe(true);
    expect(cambios.$set.licenciaAsignadaEn).toBeInstanceOf(Date);
  });

  test("es un no-op (200, sin tocar cupo) si la persona ya tenía licencia", async () => {
    findOneMock.mockResolvedValue({ _id: ID_VALIDO, rol: "reclutador", licenciaAsignada: true });

    const response = crearResponseFake();
    await handler(peticion({ accion: "asignarLicencia" }), response);

    expect(response.statusCode).toBe(200);
    expect(organizacionFindOneMock).not.toHaveBeenCalled();
    expect(findOneAndUpdateMock).not.toHaveBeenCalled();
  });

  test("cupo 0 (organización sin licencias de ese rol) también bloquea con 403", async () => {
    findOneMock.mockResolvedValue({ _id: ID_VALIDO, rol: "admin", licenciaAsignada: false });
    organizacionFindOneMock.mockResolvedValue({ licencias: { admin: 0, reclutador: 1 } });
    countDocumentsMock.mockResolvedValue(0);

    const response = crearResponseFake();
    await handler(peticion({ accion: "asignarLicencia" }), response);

    expect(response.statusCode).toBe(403);
  });
});

describe("quitarLicencia", () => {
  test("400 si es el único admin licenciado — no se deja quitar", async () => {
    findOneMock.mockResolvedValue({ _id: ID_VALIDO, rol: "admin", licenciaAsignada: true });
    countDocumentsMock.mockResolvedValue(1); // solo este admin licenciado

    const response = crearResponseFake();
    await handler(peticion({ accion: "quitarLicencia" }), response);

    expect(response.statusCode).toBe(400);
    expect(findOneAndUpdateMock).not.toHaveBeenCalled();
  });

  test("permite quitarle la licencia a un admin si hay otro admin licenciado", async () => {
    findOneMock.mockResolvedValue({ _id: ID_VALIDO, rol: "admin", licenciaAsignada: true });
    countDocumentsMock.mockResolvedValue(2); // este + al menos otro
    findOneAndUpdateMock.mockResolvedValue({ _id: ID_VALIDO, licenciaAsignada: false });

    const response = crearResponseFake();
    await handler(peticion({ accion: "quitarLicencia" }), response);

    expect(response.statusCode).toBe(200);
    const [, cambios] = findOneAndUpdateMock.mock.calls[0];
    expect(cambios.$set.licenciaAsignada).toBe(false);
    expect(cambios.$set.licenciaAsignadaEn).toBeNull();
  });

  test("a un reclutador se le puede quitar la licencia sin chequear el conteo de admins", async () => {
    findOneMock.mockResolvedValue({ _id: ID_VALIDO, rol: "reclutador", licenciaAsignada: true });
    findOneAndUpdateMock.mockResolvedValue({ _id: ID_VALIDO, licenciaAsignada: false });

    const response = crearResponseFake();
    await handler(peticion({ accion: "quitarLicencia" }), response);

    expect(response.statusCode).toBe(200);
    expect(countDocumentsMock).not.toHaveBeenCalled();
  });

  test("es un no-op (200) si la persona ya estaba sin licencia", async () => {
    findOneMock.mockResolvedValue({ _id: ID_VALIDO, rol: "reclutador", licenciaAsignada: false });

    const response = crearResponseFake();
    await handler(peticion({ accion: "quitarLicencia" }), response);

    expect(response.statusCode).toBe(200);
    expect(findOneAndUpdateMock).not.toHaveBeenCalled();
  });
});

describe("validaciones generales", () => {
  test("sin admin autenticado, no llega a tocar la base (requireAdmin ya respondió)", async () => {
    requireAdminMock.mockReturnValue(null);
    const response = crearResponseFake();
    await handler(peticion({ accion: "resetPassword", nuevaPassword: "ClaveNueva2026" }), response);

    expect(findOneAndUpdateMock).not.toHaveBeenCalled();
  });

  test("un id con formato inválido devuelve 400", async () => {
    const response = crearResponseFake();
    const request = { ...peticion({ accion: "resetPassword" }), query: { id: "no-es-un-objectid" } };
    await handler(request, response);

    expect(response.statusCode).toBe(400);
  });

  test("un método distinto de PATCH devuelve 405", async () => {
    const response = crearResponseFake();
    await handler({ ...peticion({}), method: "DELETE" }, response);

    expect(response.statusCode).toBe(405);
  });

  test("una acción desconocida devuelve 400", async () => {
    const response = crearResponseFake();
    await handler(peticion({ accion: "volarALaLuna" }), response);

    expect(response.statusCode).toBe(400);
  });
});
