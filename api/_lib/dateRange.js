// Construye un filtro Mongo { $gte, $lte } para un campo de fecha a partir de
// query params "desde"/"hasta" en formato YYYY-MM-DD (lo que manda <input type="date">).
export function buildDateRangeFilter(desde, hasta) {
  const rango = {};
  if (desde) rango.$gte = new Date(`${desde}T00:00:00.000Z`);
  if (hasta) rango.$lte = new Date(`${hasta}T23:59:59.999Z`);
  return Object.keys(rango).length > 0 ? rango : null;
}
