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

export function loginSuperadmin(password) {
  return request("/api/superadmin/login", json("POST", { password }));
}

export function logoutSuperadmin() {
  return request("/api/superadmin/logout", { method: "POST" });
}

export function getMeSuperadmin() {
  return request("/api/superadmin/me");
}

export function getOrganizaciones() {
  return request("/api/superadmin/organizaciones");
}

export function crearOrganizacion(data) {
  return request("/api/superadmin/organizaciones", json("POST", data));
}

export function actualizarLicencias(id, { admins, reclutadores }) {
  return request(`/api/superadmin/organizaciones/${id}`, json("PATCH", { admins, reclutadores }));
}
