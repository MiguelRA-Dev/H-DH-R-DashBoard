import { ObjectId } from "mongodb";
import { requireAuth } from "../_lib/auth.js";
import { getOrganizacionesCollection } from "../_lib/mongodb.js";

// Se aprovecha esta llamada (ya se hace una vez al cargar el dashboard) para
// traer también el nombre/logo de la organización — evita un segundo
// round-trip solo para pintar la marca en el encabezado.
export default async function handler(request, response) {
  if (request.method !== "GET") {
    return response.status(405).json({ error: "Método no permitido" });
  }
  const usuario = requireAuth(request, response);
  if (!usuario) return;

  try {
    const organizaciones = await getOrganizacionesCollection();
    const organizacion = await organizaciones.findOne(
      { _id: new ObjectId(usuario.organizacionId) },
      { projection: { nombre: 1, logoUrl: 1, licencias: 1 } }
    );
    response.status(200).json({
      ...usuario,
      organizacion: organizacion
        ? {
            nombre: organizacion.nombre,
            logoUrl: organizacion.logoUrl || null,
            licencias: organizacion.licencias || { admin: 0, reclutador: 0 },
          }
        : null,
    });
  } catch (error) {
    console.error(error);
    response.status(500).json({ error: "Error al obtener la sesión" });
  }
}
