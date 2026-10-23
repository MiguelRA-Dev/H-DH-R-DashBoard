import { useEffect, useState } from "react";
import ErrorState from "../components/ErrorState";
import PasswordInput from "../components/PasswordInput";
import ThemeToggle from "../components/ThemeToggle";
import LoginOrb from "../components/LoginOrb";
import LicenciaBarra from "../components/LicenciaBarra";
import { useTheme } from "../hooks/useTheme";
import {
  loginSuperadmin,
  logoutSuperadmin,
  getMeSuperadmin,
  getOrganizaciones,
  crearOrganizacion,
  actualizarLicencias,
} from "../lib/superadminApi";

const ORG_VACIA = { nombre: "", slug: "", admins: 1, reclutadores: 5, adminNombre: "", adminEmail: "" };

function SuperadminLogin({ onAutenticado }) {
  const { theme, toggleTheme } = useTheme();
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      await loginSuperadmin(password);
      onAutenticado();
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="login-screen">
      <span className="login-blob login-blob-a" />
      <span className="login-blob login-blob-b" />
      <span className="login-blob login-blob-c" />

      <div className="login-theme-toggle">
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </div>

      <div className="login-stage">
        <span className="login-dot login-dot-1" />
        <span className="login-dot login-dot-2" />
        <span className="login-dot login-dot-3" />

        <form className="login-glass-card" onSubmit={handleSubmit}>
          <span className="login-card-brand">H-AI-R · SUPERADMIN</span>
          <h2 className="login-title">Panel operativo</h2>
          <p className="login-subtitle">Fuera de cualquier organización — solo para quien opera la plataforma</p>

          {error && <div className="setup-error">{error}</div>}

          <label>Contraseña</label>
          <PasswordInput
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoFocus
          />

          <button type="submit" className="primary" disabled={enviando}>
            {enviando ? "Entrando…" : "Entrar"}
          </button>

          <p className="login-card-footer">Superadmin — H-AI-R</p>
        </form>

        <div className="login-hero">
          <LoginOrb />
          <p className="login-hero-caption">Organizaciones y licencias de toda la plataforma</p>
        </div>
      </div>
    </div>
  );
}

function FormularioLicencias({ organizacion, onGuardado, onCancelar }) {
  const [admins, setAdmins] = useState(organizacion.licencias.admin);
  const [reclutadores, setReclutadores] = useState(organizacion.licencias.reclutador);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    try {
      await actualizarLicencias(organizacion.id, {
        admins: Number(admins),
        reclutadores: Number(reclutadores),
      });
      onGuardado();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <form className="licencias-form" onSubmit={handleSubmit}>
      {error && <div className="setup-error">{error}</div>}
      <div className="form-row">
        <div>
          <label>Cupo admin</label>
          <input type="number" min={0} value={admins} onChange={(e) => setAdmins(e.target.value)} required />
        </div>
        <div>
          <label>Cupo reclutador</label>
          <input
            type="number"
            min={0}
            value={reclutadores}
            onChange={(e) => setReclutadores(e.target.value)}
            required
          />
        </div>
      </div>
      <div className="notes-editor-actions">
        <button type="submit" className="primary compact" disabled={guardando}>
          {guardando ? "Guardando…" : "Guardar cupo"}
        </button>
        <button type="button" className="link-button" onClick={onCancelar}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

export default function Superadmin() {
  // undefined = todavía no se sabe, false = no autenticado, true = sesión activa.
  const [autenticado, setAutenticado] = useState(undefined);
  const [organizaciones, setOrganizaciones] = useState(null);
  const [error, setError] = useState(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [values, setValues] = useState(ORG_VACIA);
  const [creando, setCreando] = useState(false);
  const [formError, setFormError] = useState(null);
  const [resultado, setResultado] = useState(null);
  const [editandoId, setEditandoId] = useState(null);

  useEffect(() => {
    getMeSuperadmin()
      .then(() => setAutenticado(true))
      .catch(() => setAutenticado(false));
  }, []);

  const cargar = () => {
    setError(null);
    getOrganizaciones()
      .then((data) => setOrganizaciones(data.organizaciones))
      .catch((err) => setError(err.message));
  };

  useEffect(() => {
    if (autenticado) cargar();
  }, [autenticado]);

  const handleLogout = async () => {
    await logoutSuperadmin();
    setAutenticado(false);
    setOrganizaciones(null);
  };

  const setField = (field) => (e) => setValues((v) => ({ ...v, [field]: e.target.value }));

  const handleCrear = async (e) => {
    e.preventDefault();
    setFormError(null);
    setCreando(true);
    try {
      const data = await crearOrganizacion(values);
      setResultado(data);
      setValues(ORG_VACIA);
      setMostrarForm(false);
      cargar();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setCreando(false);
    }
  };

  if (autenticado === undefined) {
    return <div className="loading-state">Cargando…</div>;
  }
  if (!autenticado) {
    return <SuperadminLogin onAutenticado={() => setAutenticado(true)} />;
  }

  return (
    <div className="superadmin-shell">
      <header className="superadmin-topbar">
        <h1>Superadmin</h1>
        <button type="button" className="secondary" onClick={handleLogout}>
          Cerrar sesión
        </button>
      </header>

      <div className="page-narrow superadmin-content">
        {resultado && (
          <div className="temp-password-banner">
            <div>
              <strong>
                Organización creada. Admin {resultado.admin.nombre} ({resultado.admin.email}):
              </strong>{" "}
              <code>{resultado.passwordTemporal}</code>
              <p className="temp-password-hint">
                Se muestra una sola vez — compártela ahora por fuera del dashboard. También va a
                necesitar el link de candidatos: /e/{resultado.organizacion.slug}
              </p>
            </div>
            <button
              type="button"
              className="link-button"
              onClick={() => navigator.clipboard?.writeText(resultado.passwordTemporal)}
            >
              Copiar
            </button>
            <button type="button" className="link-button" onClick={() => setResultado(null)}>
              Cerrar
            </button>
          </div>
        )}

        {error && <ErrorState message={error} onRetry={cargar} />}

        <div className="page-header">
          <h2>Organizaciones</h2>
          <button type="button" className="primary compact" onClick={() => setMostrarForm((v) => !v)}>
            {mostrarForm ? "Cancelar" : "+ Nueva organización"}
          </button>
        </div>

        {mostrarForm && (
          <form className="vacante-form" onSubmit={handleCrear}>
            {formError && <div className="setup-error">{formError}</div>}

            <label>Nombre de la empresa</label>
            <input
              type="text"
              value={values.nombre}
              onChange={setField("nombre")}
              placeholder="Ej: Teleperformance"
              required
            />

            <label>Slug (va en el link de candidatos: /e/slug)</label>
            <input
              type="text"
              value={values.slug}
              onChange={setField("slug")}
              placeholder="teleperformance"
              required
            />

            <div className="form-row">
              <div>
                <label>Cupo admin</label>
                <input type="number" min={1} value={values.admins} onChange={setField("admins")} required />
              </div>
              <div>
                <label>Cupo reclutador</label>
                <input
                  type="number"
                  min={0}
                  value={values.reclutadores}
                  onChange={setField("reclutadores")}
                  required
                />
              </div>
            </div>

            <label>Nombre del primer admin</label>
            <input type="text" value={values.adminNombre} onChange={setField("adminNombre")} required />

            <label>Correo del primer admin</label>
            <input type="email" value={values.adminEmail} onChange={setField("adminEmail")} required />

            <button type="submit" className="primary compact" disabled={creando}>
              {creando ? "Creando…" : "Crear organización"}
            </button>
          </form>
        )}

        {!organizaciones && !error && <div className="loading-state">Cargando organizaciones…</div>}

        {organizaciones && (
          <div className="org-list">
            {organizaciones.length === 0 && (
              <div className="empty-state">Todavía no hay organizaciones.</div>
            )}
            {organizaciones.map((org) => (
              <div className="detail-card org-card" key={org.id}>
                <div className="org-card-header">
                  <div>
                    <p className="org-card-name">{org.nombre}</p>
                    <p className="cell-muted">/e/{org.slug}</p>
                  </div>
                  <button
                    type="button"
                    className="link-button"
                    onClick={() => setEditandoId(editandoId === org.id ? null : org.id)}
                  >
                    {editandoId === org.id ? "Cancelar" : "Editar licencias"}
                  </button>
                </div>

                <div className="org-card-licencias">
                  <LicenciaBarra label="Admin" uso={org.uso.admin} cupo={org.licencias.admin} />
                  <LicenciaBarra label="Reclutador" uso={org.uso.reclutador} cupo={org.licencias.reclutador} />
                </div>

                {editandoId === org.id && (
                  <FormularioLicencias
                    organizacion={org}
                    onGuardado={() => {
                      setEditandoId(null);
                      cargar();
                    }}
                    onCancelar={() => setEditandoId(null)}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
