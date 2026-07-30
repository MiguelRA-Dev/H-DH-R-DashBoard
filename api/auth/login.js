import { getUsuariosCollection } from "../_lib/mongodb.js";
import { verificarPassword, crearTokenSesion, escribirCookieSesion } from "../_lib/auth.js";

export default async function handler(request, response) {
  if (request.method !== "POST") {
    return response.status(405).json({ error: "Método no permitido" });
  }

  const { email, password } = request.body || {};
  if (!email || !password) {
    return response.status(400).json({ error: "Falta correo o contraseña." });
  }

  try {
    const coleccion = await getUsuariosCollection();
    const usuario = await coleccion.findOne({ email: email.toLowerCase().trim() });

    if (!usuario || !verificarPassword(password, usuario.passwordHash)) {
      return response.status(401).json({ error: "Correo o contraseña incorrectos." });
    }

    const token = crearTokenSesion(usuario);
    escribirCookieSesion(response, token);
    response.status(200).json({ nombre: usuario.nombre, email: usuario.email });
  } catch (error) {
    console.error(error);
    response.status(500).json({ error: "Error al iniciar sesión" });
  }
}
