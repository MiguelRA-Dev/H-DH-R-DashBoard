import { useEffect, useState } from "react";
import { login, crearUsuario, getEstadoAuth } from "../lib/api";

// Antes de mostrar el formulario, pregunta si ya existe alguna cuenta. Si la
// colección de usuarios está vacía (primera vez que se usa el dashboard),
// deja crear la cuenta fundadora sin pedir sesión — después de esa, cualquier
// cuenta nueva sale desde la página de Usuarios, ya logueado.
export default function Login({ onAutenticado }) {
  const [cargandoEstado, setCargandoEstado] = useState(true);
  const [hayUsuarios, setHayUsuarios] = useState(true);
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    getEstadoAuth()
      .then((data) => setHayUsuarios(data.hayUsuarios))
      .catch(() => setHayUsuarios(true))
      .finally(() => setCargandoEstado(false));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      const usuario = hayUsuarios
        ? await login(email.trim(), password)
        : await crearUsuario({ nombre, email: email.trim(), password });
      onAutenticado(usuario);
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };

  if (cargandoEstado) {
    return <div className="loading-state">Cargando…</div>;
  }

  return (
    <div className="login-screen">
      <form className="vacante-form login-card" onSubmit={handleSubmit}>
        <h2 className="login-title">{hayUsuarios ? "Iniciar sesión" : "Crea la primera cuenta"}</h2>
        <p className="login-subtitle">Dashboard RRHH — H-AI-R</p>

        {!hayUsuarios && (
          <p className="login-hint">
            Todavía no hay ninguna cuenta creada en este dashboard — esta va a ser la primera.
          </p>
        )}

        {error && <div className="setup-error">{error}</div>}

        {!hayUsuarios && (
          <>
            <label>Nombre</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              autoFocus
              required
            />
          </>
        )}

        <label>Correo</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoFocus={hayUsuarios}
          required
        />

        <label>Contraseña</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          required
        />

        <button type="submit" className="primary" disabled={enviando}>
          {enviando ? "Ingresando…" : hayUsuarios ? "Ingresar" : "Crear cuenta y entrar"}
        </button>
      </form>
    </div>
  );
}
