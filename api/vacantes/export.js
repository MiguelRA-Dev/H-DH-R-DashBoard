import { ObjectId } from "mongodb";
import { getVacantesCollection } from "../_lib/mongodb.js";
import { buildVacantesFilter } from "../_lib/filters.js";
import { toCsv } from "../_lib/csv.js";
import { formatModalidad } from "../_lib/modalidad.js";
import { requireAuth } from "../_lib/auth.js";

const COLUMNS = [
  { label: "Título", value: (v) => v.titulo },
  { label: "Departamento", value: (v) => v.departamento || "" },
  { label: "Ubicación", value: (v) => v.ubicacion || "" },
  { label: "Modalidad", value: (v) => formatModalidad(v.modalidad) },
  { label: "Tipo de contrato", value: (v) => v.tipoContrato || "" },
  { label: "Estado", value: (v) => v.estado },
  { label: "Fecha creación", value: (v) => (v.creadoEn ? new Date(v.creadoEn).toISOString() : "") },
];

export default async function handler(request, response) {
  if (request.method !== "GET") {
    return response.status(405).json({ error: "Método no permitido" });
  }
  const usuario = requireAuth(request, response);
  if (!usuario) return;

  try {
    const coleccion = await getVacantesCollection();
    const filtro = {
      ...buildVacantesFilter(request.query),
      organizacionId: new ObjectId(usuario.organizacionId),
    };

    const vacantes = await coleccion
      .find(filtro, { projection: { historial: 0 } })
      .sort({ creadoEn: -1 })
      .limit(5000)
      .toArray();

    const csv = toCsv(vacantes, COLUMNS);
    response.setHeader("Content-Type", "text/csv; charset=utf-8");
    response.setHeader("Content-Disposition", 'attachment; filename="vacantes.csv"');
    response.status(200).end(csv);
  } catch (error) {
    console.error(error);
    response.status(500).json({ error: "Error al exportar vacantes" });
  }
}
