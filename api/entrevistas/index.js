import { ObjectId } from "mongodb";
import { getEntrevistasCollection } from "../_lib/mongodb.js";
import { buildEntrevistasFilter } from "../_lib/filters.js";
import { requireLicencia } from "../_lib/auth.js";

export default async function handler(request, response) {
  if (request.method !== "GET") {
    return response.status(405).json({ error: "Método no permitido" });
  }
  const usuario = requireLicencia(request, response);
  if (!usuario) return;

  try {
    const coleccion = await getEntrevistasCollection();
    const filtro = {
      ...buildEntrevistasFilter(request.query),
      organizacionId: new ObjectId(usuario.organizacionId),
    };

    const page = Math.max(1, parseInt(request.query.page, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(request.query.pageSize, 10) || 20));

    const [items, total] = await Promise.all([
      coleccion
        .find(filtro, { projection: { transcripcion: 0, historial: 0 } })
        .sort({ creadoEn: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .toArray(),
      coleccion.countDocuments(filtro),
    ]);

    response.status(200).json({ items, total, page, pageSize });
  } catch (error) {
    console.error(error);
    response.status(500).json({ error: "Error al obtener entrevistas" });
  }
}
