import { useEffect, useState } from "react";
import Select from "../components/Select";
import { getUsuarios, crearUsuario, resetearPasswordUsuario } from "../lib/api";

const ROLES = [
  { value: "admin", label: "Admin" },
  { value: "reclutador", label: "Reclutador" },
];

const ROL_LABEL = Object.fromEntries(ROLES.map((r) => [r.value, r.label]));

const CAMPOS_VACIOS = { nombre: "", email: "", cargo: "", telefono: "", rol: "reclutador", password: "" };

export default function Usuarios({ usuarioActual }) {
  const [usuarios, setUsuarios] = useState(null);
  const [error, setError] = useState(null);
  const [values, setValues] = useState(CAMPOS_VACIOS);
  const [creando, setCreando] = useState(false);
  const [formError, setFormError] = useState(null);
  const [reseteando, setReseteando] = useState(null);
  const [passwordGenerada, setPasswordGenerada] = useState(null);

  const esAdmin = usuarioActual?.rol === "admin";
  const miId = usuarioActual?.id || usuarioActual?._id;

  const cargar = () => {
    getUsuarios()
      .then((data) => setUsuarios(data.usuarios))
      .catch((err) => setError(err.message));
  };

  useEffect(cargar, []);

  const setField = (field) => (e) => setValues((v) => ({ ...v, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    setCreando(true);
    try {
      await crearUsuario(values);
      setValues(CAMPOS_VACIOS);
      cargar();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setCreando(false);
    }
  };

  const handleReset = async (usuario) => {
    if (
      !window.confirm(
        `¿Restablecer la contraseña de ${usuario.nombre}? Va a necesitar la contraseña temporal para volver a entrar.`
      )
    ) {
      return;
    }
    setReseteando(usuario._id);
    setPasswordGenerada(null);
    try {
      const { passwordTemporal } = await resetearPasswordUsuario(usuario._id);
      setPasswordGenerada({ nombre: usuario.nombre, password: passwordTemporal });
    } catch (err) {
      setError(err.message);
    } finally {
      setReseteando(null);
    }
  };

  return (
    <>
      <div className="page-header">
        <h2>Usuarios</h2>
      </div>

      {error && <div className="error-state">⚠️ {error}</div>}

      {passwordGenerada && (
        <div className="temp-password-banner">
          <div>
            <strong>Contraseña temporal para {passwordGenerada.nombre}:</strong>{" "}
            <code>{passwordGenerada.password}</code>
            <p className="temp-password-hint">
              Se muestra una sola vez — compártela ahora por fuera del dashboard. Le va a pedir
              cambiarla en su próximo ingreso.
            </p>
          </div>
          <button
            type="button"
            className="link-button"
            onClick={() => {
              navigator.clipboard?.writeText(passwordGenerada.password);
            }}
          >
            Copiar
          </button>
          <button type="button" className="link-button" onClick={() => setPasswordGenerada(null)}>
            Cerrar
          </button>
        </div>
      )}

      {!usuarios && !error && <div className="loading-state">Cargando usuarios…</div>}

      {usuarios && (
        <div className="usuarios-grid">
          <div className="usuarios-table-scroll">
            <table className="interviews-table usuarios-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Correo</th>
                  <th>Cargo</th>
                  <th>Teléfono</th>
                  <th>Rol</th>
                  {esAdmin && <th></th>}
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u) => (
                  <tr key={u._id}>
                    <td>{u.nombre}</td>
                    <td className="cell-muted">{u.email}</td>
                    <td className="cell-muted">{u.cargo || "—"}</td>
                    <td className="cell-muted">{u.telefono || "—"}</td>
                    <td>
                      <span className={`rol-badge rol-badge-${u.rol || "admin"}`}>
                        {ROL_LABEL[u.rol] || "Admin"}
                      </span>
                    </td>
                    {esAdmin && (
                      <td>
                        {u._id !== miId && (
                          <button
                            type="button"
                            className="link-button"
                            disabled={reseteando === u._id}
                            onClick={() => handleReset(u)}
                          >
                            {reseteando === u._id ? "Restableciendo…" : "Restablecer contraseña"}
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
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
              <input
                type="password"
                value={values.password}
                onChange={setField("password")}
                minLength={8}
                required
              />

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
