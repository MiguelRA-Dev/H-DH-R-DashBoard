import { requireSuperAdmin } from "../_lib/auth.js";
import { conCors } from "../_lib/cors.js";

async function handler(request, response) {
  if (request.method !== "GET") {
    return response.status(405).json({ error: "Método no permitido" });
  }
  if (!requireSuperAdmin(request, response)) return;
  response.status(200).json({ autenticado: true });
}

export default conCors(handler);
