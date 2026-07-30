import { ObjectId } from "mongodb";
import { getVacantesCollection } from "../_lib/mongodb.js";
import { requireAuth } from "../_lib/auth.js";

const ESTADOS_VALIDOS = ["abierta", "pausada", "cerrada"];
const CAMPOS_EDITABLES = [
  "titulo",
  "descripcion",
  "departamento",
  "ubicacion",
  "modalidad",
  "tipoContrato",
  "requisitos",
  "estado",
];

export default async function handler(request, response) {
  if (!requireAuth(request, response)) return;

  const { id } = request.query;
  if (!ObjectId.isValid(id)) {
    return response.status(400).json({ error: "Id inválido" });
  }

  const coleccion = await getVacantesCollection();
  const _id = new ObjectId(id);

  if (request.method === "GET") {
    try {
      const vacante = await coleccion.findOne({ _id });
      if (!vacante) return response.status(404).json({ error: "No encontrada" });
      return response.status(200).json(vacante);
    } catch (error) {
      console.error(error);
      return response.status(500).json({ error: "Error al obtener la vacante" });
    }
  }

  if (request.method === "PUT") {
    const body = request.body || {};
    if (body.titulo !== undefined && !body.titulo.trim()) {
      return response.status(400).json({ error: "El título no puede quedar vacío." });
    }
    if (body.estado !== undefined && !ESTADOS_VALIDOS.includes(body.estado)) {
      return response.status(400).json({ error: "Estado inválido." });
    }

    const cambios = { actualizadoEn: new Date() };
    for (const campo of CAMPOS_EDITABLES) {
      if (body[campo] !== undefined) cambios[campo] = body[campo];
    }

    try {
      const resultado = await coleccion.findOneAndUpdate(
        { _id },
        { $set: cambios },
        { returnDocument: "after" }
      );
      if (!resultado) return response.status(404).json({ error: "No encontrada" });
      return response.status(200).json(resultado);
    } catch (error) {
      console.error(error);
      return response.status(500).json({ error: "Error al editar la vacante" });
    }
  }

  if (request.method === "DELETE") {
    try {
      const resultado = await coleccion.deleteOne({ _id });
      if (resultado.deletedCount === 0) {
        return response.status(404).json({ error: "No encontrada" });
      }
      return response.status(204).end();
    } catch (error) {
      console.error(error);
      return response.status(500).json({ error: "Error al eliminar la vacante" });
    }
  }

  return response.status(405).json({ error: "Método no permitido" });
}
