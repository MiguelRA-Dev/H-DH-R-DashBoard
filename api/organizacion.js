import { ObjectId } from "mongodb";
import { requireAdmin } from "./_lib/auth.js";
import { getOrganizacionesCollection } from "./_lib/mongodb.js";

const NOMBRE_MAX = 60;
const LOGO_URL_MAX = 500;

// Personalización de marca por organización: nombre para mostrar y logo.
// A propósito acotado a esto — nada de colores ni layout — para que cada
// cliente vea su nombre en el dashboard y en el agente de voz sin tocar la
// identidad visual del producto en sí.
export default async function handler(request, response) {
  if (request.method !== "PATCH") {
    return response.status(405).json({ error: "Método no permitido" });
  }

  const admin = requireAdmin(request, response);
  if (!admin) return;

  const body = request.body || {};
  const cambios = {};

  if (body.nombre !== undefined) {
    const nombre = (body.nombre || "").trim();
    if (!nombre) {
      return response.status(400).json({ error: "El nombre no puede quedar vacío." });
    }
    if (nombre.length > NOMBRE_MAX) {
      return response.status(400).json({ error: `El nombre no puede pasar de ${NOMBRE_MAX} caracteres.` });
    }
    cambios.nombre = nombre;
  }

  if (body.logoUrl !== undefined) {
    const logoUrl = (body.logoUrl || "").trim();
    if (logoUrl.length > LOGO_URL_MAX) {
      return response.status(400).json({ error: "La URL del logo es demasiado larga." });
    }
    if (logoUrl && !/^https:\/\//i.test(logoUrl)) {
      return response.status(400).json({ error: "El logo debe ser una URL https:// válida." });
    }
    // Vacío = quitar el logo (vuelve a mostrar solo el nombre).
    cambios.logoUrl = logoUrl || null;
  }

  if (Object.keys(cambios).length === 0) {
    return response.status(400).json({ error: "Nada que actualizar." });
  }

  try {
    const organizaciones = await getOrganizacionesCollection();
    const resultado = await organizaciones.findOneAndUpdate(
      { _id: new ObjectId(admin.organizacionId) },
      { $set: cambios },
      { returnDocument: "after", projection: { nombre: 1, logoUrl: 1 } }
    );
    if (!resultado) return response.status(404).json({ error: "No se encontró la organización." });
    response.status(200).json({ nombre: resultado.nombre, logoUrl: resultado.logoUrl || null });
  } catch (error) {
    console.error(error);
    response.status(500).json({ error: "Error al actualizar la organización." });
  }
}
