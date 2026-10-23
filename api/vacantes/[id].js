import { ObjectId } from "mongodb";
import { getVacantesCollection } from "../_lib/mongodb.js";
import { requireLicencia, requireAdmin } from "../_lib/auth.js";

const ESTADOS_VALIDOS = ["abierta", "pausada", "cerrada"];
const IDIOMAS_VALIDOS = ["es", "en"];
const CAMPOS_EDITABLES = [
  "titulo",
  "descripcion",
  "departamento",
  "ubicacion",
  "modalidad",
  "tipoContrato",
  "requisitos",
  "idioma",
  "estado",
];
// Campos de texto largo: el historial registra que cambiaron, no el texto
// completo antes/después (crecería el documento sin límite con cada edición).
const CAMPOS_SIN_VALOR_EN_HISTORIAL = ["descripcion", "requisitos"];

export default async function handler(request, response) {
  const usuario = requireLicencia(request, response);
  if (!usuario) return;

  const { id } = request.query;
  if (!ObjectId.isValid(id)) {
    return response.status(400).json({ error: "Id inválido" });
  }

  const coleccion = await getVacantesCollection();
  const organizacionId = new ObjectId(usuario.organizacionId);
  const _id = new ObjectId(id);

  if (request.method === "GET") {
    try {
      const vacante = await coleccion.findOne({ _id, organizacionId });
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
    if (body.idioma !== undefined && !IDIOMAS_VALIDOS.includes(body.idioma)) {
      return response.status(400).json({ error: "Idioma inválido." });
    }

    try {
      const actual = await coleccion.findOne({ _id, organizacionId });
      if (!actual) return response.status(404).json({ error: "No encontrada" });

      const cambios = { actualizadoEn: new Date() };
      const historial = [];

      for (const campo of CAMPOS_EDITABLES) {
        if (body[campo] === undefined) continue;
        const valorAnterior = actual[campo] ?? "";
        const valorNuevo = body[campo] ?? "";
        if (valorAnterior !== valorNuevo) {
          historial.push({
            campo,
            valorAnterior: CAMPOS_SIN_VALOR_EN_HISTORIAL.includes(campo) ? null : valorAnterior,
            valorNuevo: CAMPOS_SIN_VALOR_EN_HISTORIAL.includes(campo) ? null : valorNuevo,
            usuarioId: usuario.id,
            usuarioNombre: usuario.nombre,
            fecha: new Date(),
          });
        }
        cambios[campo] = body[campo];
      }

      const updateDoc = { $set: cambios };
      if (historial.length > 0) updateDoc.$push = { historial: { $each: historial } };

      const resultado = await coleccion.findOneAndUpdate({ _id, organizacionId }, updateDoc, {
        returnDocument: "after",
      });
      if (!resultado) return response.status(404).json({ error: "No encontrada" });
      return response.status(200).json(resultado);
    } catch (error) {
      console.error(error);
      return response.status(500).json({ error: "Error al editar la vacante" });
    }
  }

  if (request.method === "DELETE") {
    // Borrar una vacante es la única acción destructiva de este recurso —
    // reservada a admin, igual que gestionar el equipo (ver api/usuarios).
    if (!requireAdmin(request, response)) return;
    try {
      const resultado = await coleccion.deleteOne({ _id, organizacionId });
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
