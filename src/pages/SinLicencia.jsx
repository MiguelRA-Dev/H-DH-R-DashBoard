import ThemeToggle from "../components/ThemeToggle";
import LoginOrb from "../components/LoginOrb";
import { useTheme } from "../hooks/useTheme";

// Pantalla bloqueante: la cuenta existe y la contraseña es correcta, pero un
// admin no le tiene asignada una licencia (ver Usuarios.jsx) — mismo
// tratamiento visual que Login.jsx/Superadmin.jsx (vidrio + blobs + Orb),
// para que no se sienta una pantalla de error aparte, sino parte de la
// misma marca.
export default function SinLicencia({ onLogout }) {
  const { theme, toggleTheme } = useTheme();

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

        <div className="login-glass-card">
          <span className="login-card-brand">H-AI-R</span>
          <h2 className="login-title">Sin licencia asignada</h2>
          <p className="login-subtitle">
            Tu cuenta existe y la contraseña es correcta, pero todavía no tienes acceso.
          </p>

          <p className="login-hint" style={{ margin: "0 0 22px" }}>
            Pídele a un administrador de tu organización que te asigne una licencia desde la
            pestaña "Usuarios" del dashboard — en cuanto lo haga, vuelve a iniciar sesión.
          </p>

          <button type="button" className="primary" onClick={onLogout}>
            Cerrar sesión
          </button>

          <p className="login-card-footer">Dashboard RRHH — H-AI-R</p>
        </div>

        <div className="login-hero">
          <LoginOrb />
          <p className="login-hero-caption">Esperando a que te asignen acceso</p>
        </div>
      </div>
    </div>
  );
}
