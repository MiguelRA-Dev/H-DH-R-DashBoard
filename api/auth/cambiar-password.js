import { ObjectId } from "mongodb";
import { getUsuariosCollection } from "../_lib/mongodb.js";
import {
  requireAuth,
  verificarPassword,
  hashPassword,
  crearTokenSesion,
  escribirCookieSesion,
} from "../_lib/auth.js";

// Cualquier usuario autenticado cambia su propia contraseña acá — tanto para
// el caso forzado (después de un reseteo por un admin, ver api/usuarios/[id].js)
// como si simplemente quiere cambiarla por su cuenta.
export default async function handler(request, response) {
  if (request.method !== "POST") {
    return response.status(405).json({ error: "Método no permitido" });
  }

  const usuario = requireAuth(request, response);
  if (!usuario) return;

  const { passwordActual, passwordNueva } = request.body || {};
  if (!passwordActual || !passwordNueva) {
    return response.status(400).json({ error: "Falta la contraseña actual o la nueva." });
  }
  if (passwordNueva.length < 8) {
    return response.status(400).json({ error: "La nueva contraseña debe tener al menos 8 caracteres." });
  }

  try {
    const coleccion = await getUsuariosCollection();
    const doc = await coleccion.findOne({ _id: new ObjectId(usuario.id) });
    if (!doc || !verificarPassword(passwordActual, doc.passwordHash)) {
      return response.status(401).json({ error: "La contraseña actual no es correcta." });
    }

    await coleccion.updateOne(
      { _id: doc._id },
      { $set: { passwordHash: hashPassword(passwordNueva) }, $unset: { debeCambiarPassword: "" } }
    );

    // El token de sesión lleva debeCambiarPassword firmado adentro (ver
    // crearTokenSesion): si no se reemite acá, la cookie vieja lo sigue
    // diciendo "true" aunque la contraseña ya haya cambiado, y la próxima
    // vez que se abra el dashboard vuelve a mandar a esta misma pantalla.
    const token = crearTokenSesion({ ...doc, debeCambiarPassword: false });
    escribirCookieSesion(response, token);

    response.status(200).json({ ok: true });
  } catch (error) {
    console.error(error);
    response.status(500).json({ error: "Error al cambiar la contraseña." });
  }
}
