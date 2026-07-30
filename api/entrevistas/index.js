import { getEntrevistasCollection } from "../_lib/mongodb.js";
import { buildEntrevistasFilter } from "../_lib/filters.js";
import { requireAuth } from "../_lib/auth.js";

export default async function handler(request, response) {
  if (request.method !== "GET") {
    return response.status(405).json({ error: "Método no permitido" });
  }
  if (!requireAuth(request, response)) return;

  try {
    const coleccion = await getEntrevistasCollection();
    const filtro = buildEntrevistasFilter(request.query);

    const page = Math.max(1, parseInt(request.query.page, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(request.query.pageSize, 10) || 20));

    const [items, total] = await Promise.all([
      coleccion
        .find(filtro, { projection: { transcripcion: 0 } })
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
