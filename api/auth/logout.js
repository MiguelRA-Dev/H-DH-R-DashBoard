import { borrarCookieSesion } from "../_lib/auth.js";

export default async function handler(request, response) {
  if (request.method !== "POST") {
    return response.status(405).json({ error: "Método no permitido" });
  }
  borrarCookieSesion(response);
  response.status(200).json({ ok: true });
}
