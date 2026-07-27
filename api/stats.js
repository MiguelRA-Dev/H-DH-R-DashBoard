import { getEntrevistasCollection } from "./_lib/mongodb.js";

export default async function handler(request, response) {
  if (request.method !== "GET") {
    return response.status(405).json({ error: "Método no permitido" });
  }

  try {
    const coleccion = await getEntrevistasCollection();

    const [resumen] = await coleccion
      .aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            aprobadas: { $sum: { $cond: ["$aprobado", 1, 0] } },
            puntajePromedio: { $avg: "$puntaje" },
          },
        },
      ])
      .toArray();

    const porVacante = await coleccion
      .aggregate([
        {
          $group: {
            _id: "$vacante",
            total: { $sum: 1 },
            aprobadas: { $sum: { $cond: ["$aprobado", 1, 0] } },
            puntajePromedio: { $avg: "$puntaje" },
          },
        },
        { $sort: { total: -1 } },
      ])
      .toArray();

    response.status(200).json({
      total: resumen?.total ?? 0,
      tasaAprobacion: resumen ? resumen.aprobadas / resumen.total : 0,
      puntajePromedio: resumen?.puntajePromedio ?? 0,
      porVacante: porVacante.map((v) => ({
        vacante: v._id,
        total: v.total,
        aprobadas: v.aprobadas,
        puntajePromedio: v.puntajePromedio,
      })),
    });
  } catch (error) {
    console.error(error);
    response.status(500).json({ error: "Error al calcular estadísticas" });
  }
}
