import { ObjectId } from "mongodb";
import { getVacantesCollection } from "../_lib/mongodb.js";
import { buildVacantesFilter } from "../_lib/filters.js";
import { requireLicencia } from "../_lib/auth.js";

const ESTADOS_VALIDOS = ["abierta", "pausada", "cerrada"];
const IDIOMAS_VALIDOS = ["es", "en"];

export default async function handler(request, response) {
  const usuario = requireLicencia(request, response);
  if (!usuario) return;

  const coleccion = await getVacantesCollection();
  const organizacionId = new ObjectId(usuario.organizacionId);

  if (request.method === "GET") {
    try {
      const filtro = { ...buildVacantesFilter(request.query), organizacionId };

      const page = Math.max(1, parseInt(request.query.page, 10) || 1);
      const pageSize = Math.min(100, Math.max(1, parseInt(request.query.pageSize, 10) || 20));

      const [items, total] = await Promise.all([
        coleccion
          .find(filtro, { projection: { historial: 0 } })
          .sort({ creadoEn: -1 })
          .skip((page - 1) * pageSize)
          .limit(pageSize)
          .toArray(),
        coleccion.countDocuments(filtro),
      ]);

      return response.status(200).json({ items, total, page, pageSize });
    } catch (error) {
      console.error(error);
      return response.status(500).json({ error: "Error al obtener vacantes" });
    }
  }

  if (request.method === "POST") {
    const body = request.body || {};
    const titulo = (body.titulo || "").trim();
    if (!titulo) {
      return response.status(400).json({ error: "El título de la vacante es obligatorio." });
    }

    const ahora = new Date();
    const vacante = {
      organizacionId,
      titulo,
      descripcion: body.descripcion || "",
      departamento: body.departamento || "",
      ubicacion: body.ubicacion || "",
      modalidad: body.modalidad || "",
      tipoContrato: body.tipoContrato || "",
      requisitos: body.requisitos || "",
      idioma: IDIOMAS_VALIDOS.includes(body.idioma) ? body.idioma : "es",
      estado: ESTADOS_VALIDOS.includes(body.estado) ? body.estado : "abierta",
      creadoEn: ahora,
      actualizadoEn: ahora,
    };

    try {
      const resultado = await coleccion.insertOne(vacante);
      return response.status(201).json({ ...vacante, _id: resultado.insertedId });
    } catch (error) {
      console.error(error);
      return response.status(500).json({ error: "Error al crear la vacante" });
    }
  }

  return response.status(405).json({ error: "Método no permitido" });
}
