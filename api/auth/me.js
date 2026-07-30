import { requireAuth } from "../_lib/auth.js";

export default async function handler(request, response) {
  if (request.method !== "GET") {
    return response.status(405).json({ error: "Método no permitido" });
  }
  const usuario = requireAuth(request, response);
  if (!usuario) return;
  response.status(200).json(usuario);
}
