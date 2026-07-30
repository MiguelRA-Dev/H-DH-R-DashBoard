import { ObjectId } from "mongodb";
import { getEntrevistasCollection, getVacantesCollection } from "../_lib/mongodb.js";
import { requireAuth } from "../_lib/auth.js";

const ESTADOS_PROCESO_VALIDOS = ["pendiente", "en_revision", "contratado", "descartado"];

export default async function handler(request, response) {
  if (!requireAuth(request, response)) return;

  const { id } = request.query;
  if (!ObjectId.isValid(id)) {
    return response.status(400).json({ error: "Id inválido" });
  }

  const coleccion = await getEntrevistasCollection();
  const _id = new ObjectId(id);

  if (request.method === "GET") {
    try {
      const entrevista = await coleccion.findOne({ _id });
      if (!entrevista) {
        return response.status(404).json({ error: "No encontrada" });
      }
      return response.status(200).json(entrevista);
    } catch (error) {
      console.error(error);
      return response.status(500).json({ error: "Error al obtener la entrevista" });
    }
  }

  if (request.method === "PATCH") {
    const body = request.body || {};
    if (body.estadoProceso !== undefined && !ESTADOS_PROCESO_VALIDOS.includes(body.estadoProceso)) {
      return response.status(400).json({ error: "Estado de proceso inválido." });
    }

    const set = {};
    const unset = {};

    if (body.estadoProceso !== undefined) set.estadoProceso = body.estadoProceso;
    if (body.notas !== undefined) set.notas = body.notas;

    if (body.vacanteId !== undefined) {
      if (body.vacanteId === null) {
        // Desvincula sin tocar el texto de "vacante".
        unset.vacanteId = "";
      } else {
        if (!ObjectId.isValid(body.vacanteId)) {
          return response.status(400).json({ error: "vacanteId inválido." });
        }
        const vacantesCol = await getVacantesCollection();
        const vacante = await vacantesCol.findOne({ _id: new ObjectId(body.vacanteId) });
        if (!vacante) {
          return response.status(404).json({ error: "La vacante a vincular no existe." });
        }
        // Vincula por id y sincroniza el texto con el título real de la vacante.
        set.vacanteId = vacante._id;
        set.vacante = vacante.titulo;
      }
    }

    if (Object.keys(set).length === 0 && Object.keys(unset).length === 0) {
      return response.status(400).json({ error: "Nada que actualizar." });
    }

    const updateDoc = {};
    if (Object.keys(set).length > 0) updateDoc.$set = set;
    if (Object.keys(unset).length > 0) updateDoc.$unset = unset;

    try {
      const resultado = await coleccion.findOneAndUpdate({ _id }, updateDoc, {
        returnDocument: "after",
      });
      if (!resultado) return response.status(404).json({ error: "No encontrada" });
      return response.status(200).json(resultado);
    } catch (error) {
      console.error(error);
      return response.status(500).json({ error: "Error al actualizar la entrevista" });
    }
  }

  return response.status(405).json({ error: "Método no permitido" });
}
