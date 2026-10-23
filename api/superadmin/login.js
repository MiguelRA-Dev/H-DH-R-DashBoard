import { verificarPasswordSuperadmin, crearTokenSuperadmin, escribirCookieSuperadmin } from "../_lib/auth.js";

export default async function handler(request, response) {
  if (request.method !== "POST") {
    return response.status(405).json({ error: "Método no permitido" });
  }

  const { password } = request.body || {};
  if (!password) {
    return response.status(400).json({ error: "Falta la contraseña." });
  }

  if (!process.env.SUPERADMIN_PASSWORD) {
    console.error("Falta SUPERADMIN_PASSWORD en el entorno.");
    return response.status(500).json({ error: "El acceso de superadmin no está configurado." });
  }

  if (!verificarPasswordSuperadmin(password)) {
    return response.status(401).json({ error: "Contraseña incorrecta." });
  }

  const token = crearTokenSuperadmin();
  escribirCookieSuperadmin(response, token);
  response.status(200).json({ autenticado: true });
}
