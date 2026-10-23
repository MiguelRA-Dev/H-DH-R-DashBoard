import { requireSuperAdmin } from "../_lib/auth.js";

export default async function handler(request, response) {
  if (request.method !== "GET") {
    return response.status(405).json({ error: "Método no permitido" });
  }
  if (!requireSuperAdmin(request, response)) return;
  response.status(200).json({ autenticado: true });
}
