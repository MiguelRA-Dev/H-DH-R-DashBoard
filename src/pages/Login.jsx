import { useState } from "react";
import { login, getMe } from "../lib/api";
import PasswordInput from "../components/PasswordInput";
import ThemeToggle from "../components/ThemeToggle";
import LoginOrb from "../components/LoginOrb";
import { useTheme } from "../hooks/useTheme";

// Ya no existe un "arranque sin sesión" para crear la primera cuenta: cada
// organización nace con su primer admin ya creado (ver
// scripts/crear-organizacion.js), así que esta pantalla siempre es login.
export default function Login({ onAutenticado }) {
  const { theme, toggleTheme } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [mostrarAyudaPassword, setMostrarAyudaPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      await login(email.trim(), password);
      // La respuesta de /api/auth/login no trae todo (ej. organizacion con
      // sus licencias) — pedir /api/auth/me justo después da el objeto
      // completo y evita que falte algún campo recién logueado, en vez de
      // ir agregando campos a login.js uno por uno cada vez que se necesita
      // uno nuevo (así se nos escapó organizacion.licencias la primera vez).
      const usuario = await getMe();
      onAutenticado(usuario);
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
          <span className="login-card-brand">H-AI-R</span>
          <h2 className="login-title">Iniciar sesión</h2>
          <p className="login-subtitle">Entra con la cuenta de tu organización</p>

          {error && <div className="setup-error">{error}</div>}

          <label>Correo</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus
            required
          />

          <label>Contraseña</label>
          <PasswordInput
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
          />

          <div className="login-forgot">
            <button
              type="button"
              className="link-button"
              onClick={() => setMostrarAyudaPassword((v) => !v)}
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>
          {mostrarAyudaPassword && (
            <p className="login-hint">
              Pídele a un administrador del equipo que te la restablezca desde la pestaña
              "Usuarios" del dashboard — te va a compartir una contraseña temporal y te pedirá
              cambiarla en tu próximo ingreso.
            </p>
          )}

          <button type="submit" className="primary" disabled={enviando}>
            {enviando ? "Ingresando…" : "Ingresar"}
          </button>

          <p className="login-card-footer">Dashboard RRHH — H-AI-R</p>
        </form>

        <div className="login-hero">
          <LoginOrb />
          <p className="login-hero-caption">Tu entrevistador de IA, disponible 24/7</p>
        </div>
      </div>
    </div>
  );
}
