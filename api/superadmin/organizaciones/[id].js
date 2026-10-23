import { ObjectId } from "mongodb";
import { getOrganizacionesCollection, getUsuariosCollection } from "../../_lib/mongodb.js";
import { requireSuperAdmin } from "../../_lib/auth.js";

// Si el nuevo cupo de un rol queda por debajo de cuánta gente ya tiene
// licencia de ese rol, se le quita la licencia a quien la tenga asignada
// hace MENOS tiempo primero (del más reciente al más antiguo) hasta volver
// a estar dentro del cupo — a diferencia de dejarlo "sobre cupo" esperando a
// que un humano decida (que es lo que se hizo al principio, hasta que se
// pidió que fuera automático).
//
// Nunca se llega a 0 admins licenciados por esta vía: si hiciera falta
// quitarle la licencia a TODOS los admins para caber en el cupo nuevo, se
// detiene dejando 1 — misma garantía que ya existe para el quite manual (ver
// api/usuarios/[id].js), así nunca se bloquea a una organización entera sin
// nadie que pueda entrar a arreglarlo.
async function autoRevocarSobreCupo(usuariosCol, organizacionId, licenciasNuevas) {
  const revocados = { admin: [], reclutador: [] };

  for (const rol of ["admin", "reclutador"]) {
    const cupo = licenciasNuevas[rol] ?? 0;
    const licenciados = await usuariosCol
      .find({ organizacionId, rol, licenciaAsignada: true })
      .sort({ licenciaAsignadaEn: -1, creadoEn: -1 })
      .toArray();

    let exceso = licenciados.length - cupo;
    if (exceso <= 0) continue;

    const minimoQueDebeQuedar = rol === "admin" ? 1 : 0;
    exceso = Math.min(exceso, Math.max(0, licenciados.length - minimoQueDebeQuedar));
    if (exceso === 0) continue;

    const aRevocar = licenciados.slice(0, exceso);
    await usuariosCol.updateMany(
      { _id: { $in: aRevocar.map((u) => u._id) } },
      { $set: { licenciaAsignada: false, licenciaAsignadaEn: null } }
    );
    revocados[rol] = aRevocar.map((u) => ({ id: u._id.toString(), nombre: u.nombre, email: u.email }));
  }

  return revocados;
}

export default async function handler(request, response) {
  if (!requireSuperAdmin(request, response)) return;

  if (request.method !== "PATCH") {
    return response.status(405).json({ error: "Método no permitido" });
  }

  const { id } = request.query;
  if (!ObjectId.isValid(id)) {
    return response.status(400).json({ error: "Id inválido." });
  }

  const { admins, reclutadores } = request.body || {};
  const cupoAdmins = Number(admins);
  const cupoReclutadores = Number(reclutadores);
  if (!Number.isInteger(cupoAdmins) || cupoAdmins < 0 || !Number.isInteger(cupoReclutadores) || cupoReclutadores < 0) {
    return response.status(400).json({ error: "El cupo de licencias debe ser un número entero." });
  }

  try {
    const organizacionId = new ObjectId(id);
    const licenciasNuevas = { admin: cupoAdmins, reclutador: cupoReclutadores };
    const [organizacionesCol, usuariosCol] = await Promise.all([
      getOrganizacionesCollection(),
      getUsuariosCollection(),
    ]);

    const organizacion = await organizacionesCol.findOneAndUpdate(
      { _id: organizacionId },
      { $set: { licencias: licenciasNuevas } },
      { returnDocument: "after" }
    );
    if (!organizacion) {
      return response.status(404).json({ error: "Organización no encontrada." });
    }

    const revocados = await autoRevocarSobreCupo(usuariosCol, organizacionId, licenciasNuevas);

    return response.status(200).json({
      organizacion: { id: organizacion._id.toString(), nombre: organizacion.nombre, licencias: organizacion.licencias },
      revocados,
    });
  } catch (error) {
    console.error(error);
    return response.status(500).json({ error: "Error al actualizar las licencias" });
  }
}
