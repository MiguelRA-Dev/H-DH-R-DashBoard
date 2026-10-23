import { useEffect, useState } from "react";
import Select from "../components/Select";
import ErrorState from "../components/ErrorState";
import PasswordInput from "../components/PasswordInput";
import LicenciaBarra from "../components/LicenciaBarra";
import Toggle from "../components/Toggle";
import {
  getUsuarios,
  crearUsuario,
  resetearPasswordUsuario,
  asignarLicenciaUsuario,
  quitarLicenciaUsuario,
  actualizarOrganizacion,
} from "../lib/api";

const ROLES = [
  { value: "admin", label: "Admin" },
  { value: "reclutador", label: "Reclutador" },
];

const ROL_LABEL = Object.fromEntries(ROLES.map((r) => [r.value, r.label]));

const CAMPOS_VACIOS = {
  nombre: "",
  email: "",
  cargo: "",
  telefono: "",
  rol: "reclutador",
  password: "",
  asignarLicencia: true,
};

// Iniciales para el avatar: primera letra de las dos primeras palabras del
// nombre (ej. "Miguel Angel Riaño" → "MA"), nunca más de dos para que quepan
// en el círculo sin encoger la fuente.
function iniciales(nombre) {
  return (nombre || "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || "")
    .join("");
}

export default function Usuarios({ usuarioActual }) {
  const [usuarios, setUsuarios] = useState(null);
  const [error, setError] = useState(null);
  const [values, setValues] = useState(CAMPOS_VACIOS);
  const [creando, setCreando] = useState(false);
  const [formError, setFormError] = useState(null);
  const [reseteandoId, setReseteandoId] = useState(null);
  const [nuevaPassword, setNuevaPassword] = useState("");
  const [guardandoReset, setGuardandoReset] = useState(false);
  const [resetError, setResetError] = useState(null);
  const [cambiandoLicencia, setCambiandoLicencia] = useState(null);
  const [marca, setMarca] = useState({
    nombre: usuarioActual?.organizacion?.nombre || "",
    logoUrl: usuarioActual?.organizacion?.logoUrl || "",
  });
  const [guardandoMarca, setGuardandoMarca] = useState(false);
  const [marcaError, setMarcaError] = useState(null);
  const [marcaGuardada, setMarcaGuardada] = useState(false);

  const esAdmin = usuarioActual?.rol === "admin";
  const miId = usuarioActual?.id || usuarioActual?._id;

  // Uso real de licencias de la propia organización (estilo Azure AD: cuántos
  // puestos contratados vs. cuántos ya están en uso) — se calcula del mismo
  // listado de usuarios que ya se trae para la lista de abajo, sin otra
  // llamada aparte. El cupo viene de /api/auth/me (ver organizacion.licencias).
  // Cuenta solo quienes tienen licencia asignada: ya no todas las cuentas
  // cuentan contra el cupo, solo las que de verdad tienen acceso.
  const licencias = usuarioActual?.organizacion?.licencias || { admin: 0, reclutador: 0 };
  const tieneLicencia = (u) => u.licenciaAsignada !== false;
  const usoAdmin = usuarios?.filter((u) => u.rol === "admin" && tieneLicencia(u)).length || 0;
  const usoReclutador =
    usuarios?.filter((u) => (u.rol || "reclutador") === "reclutador" && tieneLicencia(u)).length || 0;

  const cargar = () => {
    getUsuarios()
      .then((data) => setUsuarios(data.usuarios))
      .catch((err) => setError(err.message));
  };

  useEffect(cargar, []);

  const setField = (field) => (e) => setValues((v) => ({ ...v, [field]: e.target.value }));

  // Cupo/uso del rol que está elegido AHORA en el formulario — determina si
  // el checkbox de licencia se puede marcar de verdad o no.
  const usoDelRolSeleccionado = values.rol === "admin" ? usoAdmin : usoReclutador;
  const cupoDelRolSeleccionado = values.rol === "admin" ? licencias.admin : licencias.reclutador;
  const hayLicenciaDisponible = usoDelRolSeleccionado < cupoDelRolSeleccionado;
  const asignarLicenciaEfectivo = values.asignarLicencia && hayLicenciaDisponible;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    setCreando(true);
    try {
      await crearUsuario({ ...values, asignarLicencia: asignarLicenciaEfectivo });
      setValues(CAMPOS_VACIOS);
      cargar();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setCreando(false);
    }
  };

  const handleToggleLicencia = async (usuario) => {
    setError(null);
    setCambiandoLicencia(usuario._id);
    try {
      if (tieneLicencia(usuario)) {
        await quitarLicenciaUsuario(usuario._id);
      } else {
        await asignarLicenciaUsuario(usuario._id);
      }
      cargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setCambiandoLicencia(null);
    }
  };

  const abrirReset = (id) => {
    setReseteandoId(id);
    setNuevaPassword("");
    setResetError(null);
  };

  const handleResetSubmit = async (e, usuario) => {
    e.preventDefault();
    setResetError(null);
    if (nuevaPassword.length < 8) {
      setResetError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    setGuardandoReset(true);
    try {
      await resetearPasswordUsuario(usuario._id, nuevaPassword);
      setReseteandoId(null);
      setNuevaPassword("");
      cargar();
    } catch (err) {
      setResetError(err.message);
    } finally {
      setGuardandoReset(false);
    }
  };

  const handleGuardarMarca = async (e) => {
    e.preventDefault();
    setMarcaError(null);
    setMarcaGuardada(false);
    setGuardandoMarca(true);
    try {
      await actualizarOrganizacion({ nombre: marca.nombre, logoUrl: marca.logoUrl });
      setMarcaGuardada(true);
      // El nombre/logo vive en el estado de App.jsx (viene de /api/auth/me),
      // no acá — recargar es lo más simple para que el encabezado y todo lo
      // demás lo reflejen de una, sin duplicar ese estado en dos lugares.
      window.location.reload();
    } catch (err) {
      setMarcaError(err.message);
    } finally {
      setGuardandoMarca(false);
    }
  };

  return (
    <>
      <div className="page-header">
        <h2>Usuarios</h2>
      </div>

      {error && <ErrorState message={error} onRetry={cargar} />}

      {!usuarios && !error && <div className="loading-state">Cargando usuarios…</div>}

      {usuarios && (
        <div className="usuarios-grid">
          <div className="usuarios-left">
            <div className="detail-card">
              <h3>Licencias</h3>
              <p className="alert-hint">
                Puestos contratados para tu organización — habla con quien administra la cuenta si
                necesitas ampliar el cupo.
              </p>
              <div className="org-card-licencias">
                <LicenciaBarra label="Admin" uso={usoAdmin} cupo={licencias.admin} />
                <LicenciaBarra label="Reclutador" uso={usoReclutador} cupo={licencias.reclutador} />
              </div>
            </div>

            {esAdmin && (
              <form className="detail-card marca-card" onSubmit={handleGuardarMarca}>
                <h3>Marca de tu organización</h3>
                <p className="alert-hint">
                  Así se ve tu empresa en el dashboard y para los candidatos en el agente de voz —
                  el nombre y el logo, nada más. El resto del diseño se mantiene igual para todos.
                </p>
                {marcaError && <div className="setup-error">{marcaError}</div>}

                <div className="form-row">
                  <div>
                    <label>Nombre para mostrar</label>
                    <input
                      type="text"
                      value={marca.nombre}
                      onChange={(e) => setMarca((m) => ({ ...m, nombre: e.target.value }))}
                      placeholder="Ej: Teleperformance"
                      maxLength={60}
                    />
                  </div>
                  <div>
                    <label>URL del logo (opcional)</label>
                    <input
                      type="url"
                      value={marca.logoUrl}
                      onChange={(e) => setMarca((m) => ({ ...m, logoUrl: e.target.value }))}
                      placeholder="https://..."
                    />
                  </div>
                </div>

                <div className="notes-editor-actions">
                  <button type="submit" className="primary compact" disabled={guardandoMarca}>
                    {guardandoMarca ? "Guardando…" : "Guardar marca"}
                  </button>
                  {marcaGuardada && <span className="notes-saved">Guardado</span>}
                </div>
              </form>
            )}

            <div className="usuarios-list">
              {usuarios.map((u) => (
                <div className="usuario-card" key={u._id}>
                  <span className="usuario-avatar" aria-hidden="true">
                    {iniciales(u.nombre)}
                  </span>

                  <div className="usuario-info">
                    <p className="usuario-name">{u.nombre}</p>
                    <p className="usuario-email">{u.email}</p>
                    <div className="usuario-meta">
                      {u.cargo && <span>{u.cargo}</span>}
                      {u.telefono && <span>{u.telefono}</span>}
                      <span className={`rol-badge rol-badge-${u.rol || "admin"}`}>
                        {ROL_LABEL[u.rol] || "Admin"}
                      </span>
                      <span className={`licencia-estado ${tieneLicencia(u) ? "con-licencia" : "sin-licencia"}`}>
                        <span className="licencia-dot" />
                        {tieneLicencia(u) ? "Con licencia" : "Sin licencia"}
                      </span>
                    </div>
                  </div>

                  {esAdmin && (
                    <div className="usuario-actions-col">
                      <div className="toggle-row">
                        <span className="toggle-row-label">
                          {cambiandoLicencia === u._id ? "Guardando…" : "Licencia"}
                        </span>
                        <Toggle
                          checked={tieneLicencia(u)}
                          disabled={
                            cambiandoLicencia === u._id ||
                            (!tieneLicencia(u) &&
                              (u.rol === "admin" ? usoAdmin >= licencias.admin : usoReclutador >= licencias.reclutador))
                          }
                          onChange={() => handleToggleLicencia(u)}
                          label={`${tieneLicencia(u) ? "Quitar" : "Asignar"} licencia a ${u.nombre}`}
                        />
                      </div>
                      {u._id !== miId &&
                        (reseteandoId === u._id ? (
                          <form
                            className="reset-password-inline"
                            onSubmit={(e) => handleResetSubmit(e, u)}
                          >
                            {resetError && <div className="setup-error">{resetError}</div>}
                            <PasswordInput
                              value={nuevaPassword}
                              onChange={(e) => setNuevaPassword(e.target.value)}
                              placeholder="Contraseña nueva"
                              minLength={8}
                              autoFocus
                              required
                            />
                            <div className="reset-password-actions">
                              <button type="submit" className="primary compact" disabled={guardandoReset}>
                                {guardandoReset ? "Guardando…" : "Guardar"}
                              </button>
                              <button
                                type="button"
                                className="link-button"
                                onClick={() => setReseteandoId(null)}
                                disabled={guardandoReset}
                              >
                                Cancelar
                              </button>
                            </div>
                          </form>
                        ) : (
                          <button
                            type="button"
                            className="link-button usuario-action"
                            onClick={() => abrirReset(u._id)}
                          >
                            Restablecer contraseña
                          </button>
                        ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {esAdmin ? (
            <form className="vacante-form usuarios-form" onSubmit={handleSubmit}>
              <h3 className="usuarios-form-title">Agregar persona al equipo</h3>
              {formError && <div className="setup-error">{formError}</div>}

              <label>Nombre</label>
              <input type="text" value={values.nombre} onChange={setField("nombre")} required />

              <label>Correo</label>
              <input type="email" value={values.email} onChange={setField("email")} required />

              <div className="form-row">
                <div>
                  <label>Cargo</label>
                  <input
                    type="text"
                    value={values.cargo}
                    onChange={setField("cargo")}
                    placeholder="Reclutador, Gerente RRHH…"
                  />
                </div>
                <div>
                  <label>Teléfono</label>
                  <input type="tel" value={values.telefono} onChange={setField("telefono")} />
                </div>
              </div>

              <label>Rol</label>
              <Select
                value={values.rol}
                options={ROLES}
                onChange={(rol) => setValues((v) => ({ ...v, rol }))}
              />

              <label>Contraseña</label>
              <PasswordInput
                value={values.password}
                onChange={setField("password")}
                minLength={8}
                required
              />

              <div className="toggle-field">
                <Toggle
                  checked={asignarLicenciaEfectivo}
                  disabled={!hayLicenciaDisponible}
                  onChange={(val) => setValues((v) => ({ ...v, asignarLicencia: val }))}
                  label="Asignar licencia a esta persona"
                />
                <div>
                  <p className="toggle-field-title">Asignar licencia a esta persona</p>
                  <p className="cell-muted">
                    {hayLicenciaDisponible
                      ? "Sin esto, la cuenta queda creada pero sin acceso hasta que se le asigne una licencia."
                      : `No hay cupo de ${values.rol === "admin" ? "administrador" : "reclutador"} disponible — la cuenta se crea sin licencia, se le puede asignar después si se libera un cupo.`}
                  </p>
                </div>
              </div>

              <button type="submit" className="primary compact" disabled={creando}>
                {creando ? "Creando…" : "Crear cuenta"}
              </button>
            </form>
          ) : (
            <div className="detail-card usuarios-form">
              <p className="cell-muted">
                Solo un administrador puede agregar personas al equipo o restablecer contraseñas.
              </p>
            </div>
          )}
        </div>
      )}
    </>
  );
}
