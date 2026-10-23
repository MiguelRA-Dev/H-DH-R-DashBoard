// CORS explícito por allowlist. Hoy el frontend y la API sirven del mismo
// origen (Vercel primero, Azure después), así que el navegador ni pide
// permiso — pero sin esto, el día que ese supuesto deje de ser cierto (un
// subdominio separado, el agente de voz llamando a esta API desde otro
// origen) la API queda abierta a cualquiera por omisión. CORS_ALLOWED_ORIGINS
// es una lista separada por comas en variables de entorno; sin configurar,
// ningún origen cruzado pasa.
function origenesPermitidos() {
  return (process.env.CORS_ALLOWED_ORIGINS || "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
}

const METODOS_PERMITIDOS = "GET, POST, PUT, PATCH, DELETE, OPTIONS";

export function conCors(handler) {
  return async function handlerConCors(request, response) {
    const origen = request.headers.origin;
    if (origen && origenesPermitidos().includes(origen)) {
      response.setHeader("Access-Control-Allow-Origin", origen);
      response.setHeader("Access-Control-Allow-Credentials", "true");
    }
    response.setHeader("Vary", "Origin");

    if (request.method === "OPTIONS") {
      response.setHeader("Access-Control-Allow-Methods", METODOS_PERMITIDOS);
      response.setHeader("Access-Control-Allow-Headers", "Content-Type");
      response.status(204).end();
      return;
    }

    return handler(request, response);
  };
}
