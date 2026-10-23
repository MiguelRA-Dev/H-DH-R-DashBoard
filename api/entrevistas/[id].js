import { ObjectId } from "mongodb";
import { getEntrevistasCollection, getVacantesCollection } from "../_lib/mongodb.js";
import { requireLicencia } from "../_lib/auth.js";
import { conCors } from "../_lib/cors.js";

const ESTADOS_PROCESO_VALIDOS = ["pendiente", "en_revision", "contratado", "descartado"];

async function handler(request, response) {
  const usuario = requireLicencia(request, response);
  if (!usuario) return;

  const { id } = request.query;
  if (!ObjectId.isValid(id)) {
    return response.status(400).json({ error: "Id inválido" });
  }

  const coleccion = await getEntrevistasCollection();
  const organizacionId = new ObjectId(usuario.organizacionId);
  // En cada operación, _id Y organizacionId van juntos en el filtro: adivinar
  // un _id válido de otra empresa no debe alcanzar para ver ni tocar nada.
  const _id = new ObjectId(id);

  if (request.method === "GET") {
    try {
      const entrevista = await coleccion.findOne({ _id, organizacionId });
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

    try {
      // Se trae el documento actual primero: sin esto no hay con qué comparar
      // para saber si de verdad cambió algo (y qué registrar en el historial).
      const actual = await coleccion.findOne({ _id, organizacionId });
      if (!actual) return response.status(404).json({ error: "No encontrada" });

      const set = {};
      const unset = {};
      const historial = [];

      // Un cambio solo se registra si el valor de verdad es distinto — volver
      // a guardar lo mismo (ej. notas sin tocar) no debe ensuciar el log.
      const registrar = (campo, valorAnterior, valorNuevo) => {
        if (valorAnterior === valorNuevo) return;
        historial.push({
          campo,
          valorAnterior: valorAnterior ?? null,
          valorNuevo: valorNuevo ?? null,
          usuarioId: usuario.id,
          usuarioNombre: usuario.nombre,
          fecha: new Date(),
        });
      };

      if (body.estadoProceso !== undefined) {
        registrar("estadoProceso", actual.estadoProceso || "pendiente", body.estadoProceso);
        set.estadoProceso = body.estadoProceso;
      }

      if (body.notas !== undefined) {
        // El texto no se guarda en el historial a propósito (podría crecer
        // sin límite con cada edición) — solo que alguien lo tocó, quién y
        // cuándo. El contenido actual ya se ve en la ficha.
        if ((actual.notas || "") !== (body.notas || "")) {
          historial.push({
            campo: "notas",
            valorAnterior: null,
            valorNuevo: null,
            usuarioId: usuario.id,
            usuarioNombre: usuario.nombre,
            fecha: new Date(),
          });
        }
        set.notas = body.notas;
      }

      if (body.vacanteId !== undefined) {
        if (body.vacanteId === null) {
          // Desvincula sin tocar el texto de "vacante".
          if (actual.vacanteId) {
            registrar("vacante", actual.vacante || "Vinculada", "Sin vincular");
          }
          unset.vacanteId = "";
        } else {
          if (!ObjectId.isValid(body.vacanteId)) {
            return response.status(400).json({ error: "vacanteId inválido." });
          }
          const vacantesCol = await getVacantesCollection();
          // También con organizacionId en el filtro: sin esto se podría vincular
          // una entrevista propia a la vacante de otra empresa adivinando su id.
          const vacante = await vacantesCol.findOne({
            _id: new ObjectId(body.vacanteId),
            organizacionId,
          });
          if (!vacante) {
            return response.status(404).json({ error: "La vacante a vincular no existe." });
          }
          registrar("vacante", actual.vacanteId ? actual.vacante : "Sin vincular", vacante.titulo);
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
      if (historial.length > 0) updateDoc.$push = { historial: { $each: historial } };

      const resultado = await coleccion.findOneAndUpdate({ _id, organizacionId }, updateDoc, {
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

export default conCors(handler);
