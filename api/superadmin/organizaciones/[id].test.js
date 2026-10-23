import { describe, test, expect, vi } from "vitest";

// autoRevocarSobreCupo es lo único que estos tests ejercitan, pero importar
// el archivo igual corre sus imports de nivel superior — sin mockear
// mongodb.js, eso intentaría conectar a un Mongo real solo por importar.
vi.mock("../../_lib/mongodb.js", () => ({
  getUsuariosCollection: vi.fn(),
  getOrganizacionesCollection: vi.fn(),
}));
vi.mock("../../_lib/auth.js", () => ({ requireSuperAdmin: vi.fn() }));

const { autoRevocarSobreCupo } = await import("./[id].js");

// autoRevocarSobreCupo confía en que el .sort() de Mongo ya le entrega la
// lista del más reciente al más antiguo (licenciaAsignadaEn desc) — el fake
// no re-implementa el sort, solo devuelve lo que el test le da en ese orden,
// igual que ya hace agente-voz/server/db.test.js con sus mocks de colección.
function usuario(id, nombre) {
  return { _id: { toString: () => id, raw: id }, nombre, email: `${nombre}@empresa.com` };
}

function crearColeccionFake(porRol) {
  const updateManyMock = vi.fn();
  const findMock = vi.fn((filtro) => ({
    sort: () => ({
      toArray: async () => porRol[filtro.rol] || [],
    }),
  }));
  return { find: findMock, updateMany: updateManyMock };
}

describe("autoRevocarSobreCupo", () => {
  test("no revoca nada si nadie queda sobre cupo", async () => {
    const col = crearColeccionFake({
      admin: [usuario("a1", "Admin Uno")],
      reclutador: [usuario("r1", "Rec Uno"), usuario("r2", "Rec Dos")],
    });

    const revocados = await autoRevocarSobreCupo(col, "org1", { admin: 2, reclutador: 5 });

    expect(revocados).toEqual({ admin: [], reclutador: [] });
    expect(col.updateMany).not.toHaveBeenCalled();
  });

  test("revoca del más reciente al más antiguo cuando un rol queda sobre cupo", async () => {
    // Orden tal como lo entregaría el sort real: más reciente primero.
    const masReciente = usuario("r3", "Rec Tres (más reciente)");
    const medio = usuario("r2", "Rec Dos");
    const masAntiguo = usuario("r1", "Rec Uno (más antiguo)");
    const col = crearColeccionFake({
      admin: [usuario("a1", "Admin Uno")],
      reclutador: [masReciente, medio, masAntiguo],
    });

    const revocados = await autoRevocarSobreCupo(col, "org1", { admin: 2, reclutador: 1 });

    // De 3 a 1 → se revocan 2, empezando por el más reciente.
    expect(revocados.reclutador.map((u) => u.id)).toEqual(["r3", "r2"]);
    expect(revocados.admin).toEqual([]);

    const [filtro, cambios] = col.updateMany.mock.calls[0];
    expect(filtro._id.$in.map((id) => id.raw)).toEqual(["r3", "r2"]);
    expect(cambios.$set).toEqual({ licenciaAsignada: false, licenciaAsignadaEn: null });
  });

  test("nunca deja 0 admins licenciados — se detiene en 1 aunque el cupo nuevo sea 0", async () => {
    const admins = [
      usuario("a3", "Admin Tres (más reciente)"),
      usuario("a2", "Admin Dos"),
      usuario("a1", "Admin Uno (más antiguo)"),
    ];
    const col = crearColeccionFake({ admin: admins, reclutador: [] });

    const revocados = await autoRevocarSobreCupo(col, "org1", { admin: 0, reclutador: 0 });

    // De 3 admins a cupo 0 → en teoría se revocarían los 3, pero se detiene
    // dejando 1 (el más antiguo, a1, es el que sobrevive).
    expect(revocados.admin.map((u) => u.id)).toEqual(["a3", "a2"]);
    expect(revocados.admin).toHaveLength(2);
  });

  test("a reclutador sí se le puede bajar hasta 0 — no tiene piso de 1", async () => {
    const col = crearColeccionFake({
      admin: [],
      reclutador: [usuario("r2", "Rec Dos"), usuario("r1", "Rec Uno")],
    });

    const revocados = await autoRevocarSobreCupo(col, "org1", { admin: 0, reclutador: 0 });

    expect(revocados.reclutador.map((u) => u.id)).toEqual(["r2", "r1"]);
  });

  test("procesa admin y reclutador de forma independiente en la misma llamada", async () => {
    const col = crearColeccionFake({
      admin: [usuario("a2", "Admin Dos"), usuario("a1", "Admin Uno")],
      reclutador: [usuario("r2", "Rec Dos"), usuario("r1", "Rec Uno"), usuario("r0", "Rec Cero")],
    });

    const revocados = await autoRevocarSobreCupo(col, "org1", { admin: 1, reclutador: 2 });

    expect(revocados.admin.map((u) => u.id)).toEqual(["a2"]);
    expect(revocados.reclutador.map((u) => u.id)).toEqual(["r2"]);
    expect(col.updateMany).toHaveBeenCalledTimes(2);
  });

  test("un cupo igual al uso actual no dispara ninguna revocación", async () => {
    const col = crearColeccionFake({
      admin: [usuario("a1", "Admin Uno")],
      reclutador: [usuario("r1", "Rec Uno")],
    });

    const revocados = await autoRevocarSobreCupo(col, "org1", { admin: 1, reclutador: 1 });

    expect(revocados).toEqual({ admin: [], reclutador: [] });
    expect(col.updateMany).not.toHaveBeenCalled();
  });
});
