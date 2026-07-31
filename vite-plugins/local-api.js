import { pathToFileURL } from "node:url";
import path from "node:path";

// Mismas rutas que despliega Vercel a partir de /api, resueltas a mano para
// poder ejecutar los handlers dentro del propio servidor de Vite en desarrollo
// local (sin depender de `vercel dev` ni de iniciar sesión en Vercel).
// Las rutas estáticas (ej. /export) van antes que las dinámicas ([id]) para no
// confundirlas — mismo orden de precedencia que usa Vercel entre ambas.
const routes = [
  { pattern: /^\/api\/stats\/?$/, file: "api/stats.js", params: [] },
  { pattern: /^\/api\/auth\/login\/?$/, file: "api/auth/login.js", params: [] },
  { pattern: /^\/api\/auth\/logout\/?$/, file: "api/auth/logout.js", params: [] },
  { pattern: /^\/api\/auth\/me\/?$/, file: "api/auth/me.js", params: [] },
  { pattern: /^\/api\/auth\/estado\/?$/, file: "api/auth/estado.js", params: [] },
  { pattern: /^\/api\/auth\/cambiar-password\/?$/, file: "api/auth/cambiar-password.js", params: [] },
  { pattern: /^\/api\/usuarios\/?$/, file: "api/usuarios/index.js", params: [] },
  { pattern: /^\/api\/usuarios\/([^/]+)\/?$/, file: "api/usuarios/[id].js", params: ["id"] },
  { pattern: /^\/api\/entrevistas\/export\/?$/, file: "api/entrevistas/export.js", params: [] },
  { pattern: /^\/api\/entrevistas\/?$/, file: "api/entrevistas/index.js", params: [] },
  { pattern: /^\/api\/entrevistas\/([^/]+)\/?$/, file: "api/entrevistas/[id].js", params: ["id"] },
  { pattern: /^\/api\/vacantes\/export\/?$/, file: "api/vacantes/export.js", params: [] },
  { pattern: /^\/api\/vacantes\/?$/, file: "api/vacantes/index.js", params: [] },
  { pattern: /^\/api\/vacantes\/([^/]+)\/?$/, file: "api/vacantes/[id].js", params: ["id"] },
];

function withResponseHelpers(res) {
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (body) => {
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(body));
  };
  return res;
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    if (req.method === "GET" || req.method === "DELETE") return resolve(undefined);

    let raw = "";
    req.on("data", (chunk) => (raw += chunk));
    req.on("end", () => {
      if (!raw) return resolve(undefined);
      try {
        resolve(JSON.parse(raw));
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

// Recarga el módulo en cada request (query string única) para que los cambios
// en /api se reflejen sin reiniciar el servidor de desarrollo.
async function loadHandler(root, file) {
  const absolute = path.join(root, file);
  const url = `${pathToFileURL(absolute).href}?t=${Date.now()}`;
  const mod = await import(url);
  return mod.default;
}

export default function localApiPlugin() {
  return {
    name: "local-api",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url.startsWith("/api/")) return next();

        const url = new URL(req.url, "http://localhost");
        const route = routes.find((r) => r.pattern.test(url.pathname));
        if (!route) {
          res.statusCode = 404;
          return res.end(JSON.stringify({ error: "Ruta no encontrada" }));
        }

        const match = url.pathname.match(route.pattern);
        const query = Object.fromEntries(url.searchParams);
        route.params.forEach((name, i) => {
          query[name] = decodeURIComponent(match[i + 1]);
        });
        req.query = query;

        try {
          req.body = await readJsonBody(req);
        } catch {
          res.statusCode = 400;
          return res.end(JSON.stringify({ error: "JSON inválido en el body" }));
        }

        try {
          const handler = await loadHandler(server.config.root, route.file);
          withResponseHelpers(res);
          await handler(req, res);
        } catch (err) {
          console.error(`Error en ${route.file}:`, err);
          res.statusCode = 500;
          res.end(JSON.stringify({ error: "Error interno" }));
        }
      });
    },
  };
}
