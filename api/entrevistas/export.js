import { ObjectId } from "mongodb";
import { getEntrevistasCollection } from "../_lib/mongodb.js";
import { buildEntrevistasFilter } from "../_lib/filters.js";
import { toCsv } from "../_lib/csv.js";
import { requireLicencia } from "../_lib/auth.js";

const COLUMNS = [
  { label: "Candidato", value: (e) => e.candidato },
  { label: "Vacante", value: (e) => e.vacante },
  { label: "Aprobado", value: (e) => (e.aprobado ? "Sí" : "No") },
  { label: "Puntaje", value: (e) => e.puntaje },
  { label: "Estado proceso", value: (e) => e.estadoProceso || "pendiente" },
  { label: "Resumen", value: (e) => e.resumen || "" },
  { label: "Fortalezas", value: (e) => (e.fortalezas || []).join("; ") },
  { label: "Áreas de mejora", value: (e) => (e.areasDeMejora || []).join("; ") },
  { label: "Notas RRHH", value: (e) => e.notas || "" },
  { label: "Fecha", value: (e) => (e.creadoEn ? new Date(e.creadoEn).toISOString() : "") },
];

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

    const entrevistas = await coleccion
      .find(filtro, { projection: { transcripcion: 0, historial: 0 } })
      .sort({ creadoEn: -1 })
      .limit(5000)
      .toArray();

    const csv = toCsv(entrevistas, COLUMNS);
    response.setHeader("Content-Type", "text/csv; charset=utf-8");
    response.setHeader("Content-Disposition", 'attachment; filename="entrevistas.csv"');
    response.status(200).end(csv);
  } catch (error) {
    console.error(error);
    response.status(500).json({ error: "Error al exportar entrevistas" });
  }
}
