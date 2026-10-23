import { ObjectId } from "mongodb";
import { getOrganizacionesCollection } from "../../_lib/mongodb.js";
import { requireSuperAdmin } from "../../_lib/auth.js";

// Única forma hoy de ampliar el cupo de una organización ya creada — antes
// de esto no existía ni en la UI ni en un script, tocaba editar Mongo a mano.
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
    const organizacionesCol = await getOrganizacionesCollection();
    const organizacion = await organizacionesCol.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { licencias: { admin: cupoAdmins, reclutador: cupoReclutadores } } },
      { returnDocument: "after" }
    );
    if (!organizacion) {
      return response.status(404).json({ error: "Organización no encontrada." });
    }
    return response.status(200).json({
      organizacion: { id: organizacion._id.toString(), nombre: organizacion.nombre, licencias: organizacion.licencias },
    });
  } catch (error) {
    console.error(error);
    return response.status(500).json({ error: "Error al actualizar las licencias" });
  }
}
