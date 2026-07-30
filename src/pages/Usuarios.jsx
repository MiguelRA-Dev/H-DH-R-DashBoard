import { useEffect, useState } from "react";
import { getUsuarios, crearUsuario } from "../lib/api";

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState(null);
  const [error, setError] = useState(null);
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [creando, setCreando] = useState(false);
  const [formError, setFormError] = useState(null);

  const cargar = () => {
    getUsuarios()
      .then((data) => setUsuarios(data.usuarios))
      .catch((err) => setError(err.message));
  };

  useEffect(cargar, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    setCreando(true);
    try {
      await crearUsuario({ nombre, email, password });
      setNombre("");
      setEmail("");
      setPassword("");
      cargar();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setCreando(false);
    }
  };

  return (
    <>
      <div className="page-header">
        <h2>Usuarios</h2>
      </div>

      {error && <div className="error-state">⚠️ {error}</div>}
      {!usuarios && !error && <div className="loading-state">Cargando usuarios…</div>}

      {usuarios && (
        <table className="interviews-table usuarios-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Correo</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => (
              <tr key={u._id}>
                <td>{u.nombre}</td>
                <td className="cell-muted">{u.email}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="page-narrow usuarios-form-wrap">
        <form className="vacante-form" onSubmit={handleSubmit}>
          <h3 className="usuarios-form-title">Agregar persona al equipo</h3>
          {formError && <div className="setup-error">{formError}</div>}

          <label>Nombre</label>
          <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} required />

          <label>Correo</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />

          <label>Contraseña</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
          />

          <button type="submit" className="primary compact" disabled={creando}>
            {creando ? "Creando…" : "Crear cuenta"}
          </button>
        </form>
      </div>
    </>
  );
}
