async function request(path, options) {
  const res = await fetch(path, options);
  if (res.status === 204) return null;
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Error de red");
  return data;
}

function json(method, body) {
  return {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

export function login(email, password) {
  return request("/api/auth/login", json("POST", { email, password }));
}

export function logout() {
  return request("/api/auth/logout", { method: "POST" });
}

export function getMe() {
  return request("/api/auth/me");
}

export function getUsuarios() {
  return request("/api/usuarios");
}

export function crearUsuario(data) {
  return request("/api/usuarios", json("POST", data));
}

export function resetearPasswordUsuario(id) {
  return request(`/api/usuarios/${id}`, json("PATCH", { accion: "resetPassword" }));
}

export function asignarLicenciaUsuario(id) {
  return request(`/api/usuarios/${id}`, json("PATCH", { accion: "asignarLicencia" }));
}

export function quitarLicenciaUsuario(id) {
  return request(`/api/usuarios/${id}`, json("PATCH", { accion: "quitarLicencia" }));
}

export function cambiarPassword(passwordActual, passwordNueva) {
  return request("/api/auth/cambiar-password", json("POST", { passwordActual, passwordNueva }));
}

export function getStats() {
  return request("/api/stats");
}

export function actualizarOrganizacion(data) {
  return request("/api/organizacion", json("PATCH", data));
}

export function getEntrevistas({ vacante, vacanteId, aprobado, q, desde, hasta, page, pageSize } = {}) {
  const params = new URLSearchParams();
  if (vacante) params.set("vacante", vacante);
  if (vacanteId) params.set("vacanteId", vacanteId);
  if (aprobado !== undefined && aprobado !== "") params.set("aprobado", aprobado);
  if (q) params.set("q", q);
  if (desde) params.set("desde", desde);
  if (hasta) params.set("hasta", hasta);
  if (page) params.set("page", page);
  if (pageSize) params.set("pageSize", pageSize);
  const query = params.toString();
  return request(`/api/entrevistas${query ? `?${query}` : ""}`);
}

export function getEntrevista(id) {
  return request(`/api/entrevistas/${id}`);
}

export function patchEntrevista(id, data) {
  return request(`/api/entrevistas/${id}`, json("PATCH", data));
}

export function getVacantes({ q, estado, desde, hasta, page, pageSize } = {}) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (estado) params.set("estado", estado);
  if (desde) params.set("desde", desde);
  if (hasta) params.set("hasta", hasta);
  if (page) params.set("page", page);
  if (pageSize) params.set("pageSize", pageSize);
  const query = params.toString();
  return request(`/api/vacantes${query ? `?${query}` : ""}`);
}

export function getVacante(id) {
  return request(`/api/vacantes/${id}`);
}

export function createVacante(data) {
  return request("/api/vacantes", json("POST", data));
}

export function updateVacante(id, data) {
  return request(`/api/vacantes/${id}`, json("PUT", data));
}

export function deleteVacante(id) {
  return request(`/api/vacantes/${id}`, { method: "DELETE" });
}

function buildExportUrl(base, { vacante, vacanteId, aprobado, q, estado, desde, hasta } = {}) {
  const params = new URLSearchParams();
  if (vacante) params.set("vacante", vacante);
  if (vacanteId) params.set("vacanteId", vacanteId);
  if (aprobado !== undefined && aprobado !== "") params.set("aprobado", aprobado);
  if (estado) params.set("estado", estado);
  if (q) params.set("q", q);
  if (desde) params.set("desde", desde);
  if (hasta) params.set("hasta", hasta);
  const query = params.toString();
  return `${base}${query ? `?${query}` : ""}`;
}

export function buildEntrevistasExportUrl(filtros) {
  return buildExportUrl("/api/entrevistas/export", filtros);
}

export function buildVacantesExportUrl(filtros) {
  return buildExportUrl("/api/vacantes/export", filtros);
}
