import { borrarCookieSuperadmin } from "../_lib/auth.js";
import { conCors } from "../_lib/cors.js";

async function handler(request, response) {
  if (request.method !== "POST") {
    return response.status(405).json({ error: "Método no permitido" });
  }
  borrarCookieSuperadmin(response);
  response.status(200).json({ ok: true });
}

export default conCors(handler);
