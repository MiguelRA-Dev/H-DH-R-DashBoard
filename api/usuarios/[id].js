import { ObjectId } from "mongodb";
import { getUsuariosCollection } from "../_lib/mongodb.js";
import { requireAdmin, hashPassword, generarPasswordTemporal } from "../_lib/auth.js";

// Reseteo manual de contraseña: en vez de un flujo de "olvidé mi contraseña"
// por correo (que requeriría un proveedor de email nuevo), un admin genera
// acá una contraseña temporal y se la comparte a la persona por fuera del
// dashboard (WhatsApp, en persona, etc.). Queda marcada con
// debeCambiarPassword para que el login la obligue a poner una propia.
export default async function handler(request, response) {
  const admin = requireAdmin(request, response);
  if (!admin) return;

  if (request.method !== "PATCH") {
    return response.status(405).json({ error: "Método no permitido" });
  }

  const { id } = request.query;
  if (!ObjectId.isValid(id)) {
    return response.status(400).json({ error: "Id inválido." });
  }

  const body = request.body || {};
  if (body.accion !== "resetPassword") {
    return response.status(400).json({ error: "Acción no reconocida." });
  }

  try {
    const coleccion = await getUsuariosCollection();
    const passwordTemporal = generarPasswordTemporal();

    const usuario = await coleccion.findOneAndUpdate(
      // organizacionId también en el filtro: sin esto, un admin podría
      // resetear la contraseña de alguien de OTRA empresa con solo adivinar
      // su id.
      { _id: new ObjectId(id), organizacionId: new ObjectId(admin.organizacionId) },
      { $set: { passwordHash: hashPassword(passwordTemporal), debeCambiarPassword: true } },
      { returnDocument: "after", projection: { passwordHash: 0 } }
    );
    if (!usuario) {
      return response.status(404).json({ error: "Usuario no encontrado." });
    }

    return response.status(200).json({ usuario, passwordTemporal });
  } catch (error) {
    console.error(error);
    return response.status(500).json({ error: "Error al restablecer la contraseña." });
  }
}
