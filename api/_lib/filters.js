import { ObjectId } from "mongodb";
import { buildDateRangeFilter } from "./dateRange.js";

const ESTADOS_VACANTE_VALIDOS = ["abierta", "pausada", "cerrada"];

export function buildEntrevistasFilter(query) {
  const filtro = {};

  if (query.vacanteId && ObjectId.isValid(query.vacanteId)) {
    const id = new ObjectId(query.vacanteId);
    // Prioriza el vínculo por id; si además viene el texto de la vacante, cae a
    // coincidencia exacta para las entrevistas que aún no se vincularon por id.
    filtro.$or = query.vacante
      ? [{ vacanteId: id }, { vacante: query.vacante, vacanteId: { $exists: false } }]
      : [{ vacanteId: id }];
  } else if (query.vacante) {
    filtro.vacante = query.vacante;
  }

  if (query.aprobado !== undefined) {
    filtro.aprobado = query.aprobado === "true";
  }
  if (query.q) {
    filtro.candidato = { $regex: query.q, $options: "i" };
  }
  const rangoFechas = buildDateRangeFilter(query.desde, query.hasta);
  if (rangoFechas) filtro.creadoEn = rangoFechas;

  return filtro;
}

export function buildVacantesFilter(query) {
  const filtro = {};
  if (query.q) {
    filtro.titulo = { $regex: query.q, $options: "i" };
  }
  if (query.estado && ESTADOS_VACANTE_VALIDOS.includes(query.estado)) {
    filtro.estado = query.estado;
  }
  const rangoFechas = buildDateRangeFilter(query.desde, query.hasta);
  if (rangoFechas) filtro.creadoEn = rangoFechas;
  return filtro;
}
