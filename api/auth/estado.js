import { getUsuariosCollection } from "../_lib/mongodb.js";

// Público a propósito (sin requireAuth): el login necesita saber, antes de
// que exista cualquier sesión, si debe mostrar "iniciar sesión" o "crear la
// primera cuenta". Solo expone un booleano, nada sensible.
export default async function handler(request, response) {
  if (request.method !== "GET") {
    return response.status(405).json({ error: "Método no permitido" });
  }

  try {
    const coleccion = await getUsuariosCollection();
    const total = await coleccion.countDocuments();
    response.status(200).json({ hayUsuarios: total > 0 });
  } catch (error) {
    console.error(error);
    response.status(500).json({ error: "Error al consultar el estado" });
  }
}
