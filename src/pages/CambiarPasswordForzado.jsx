import { useState } from "react";
import { cambiarPassword } from "../lib/api";
import PasswordInput from "../components/PasswordInput";

// Pantalla bloqueante: aparece cuando un admin acaba de resetear la
// contraseña de esta cuenta (ver Usuarios.jsx) y todavía está usando la
// temporal. No deja pasar al resto del dashboard hasta que ponga una propia.
export default function CambiarPasswordForzado({ onCambiada, onLogout }) {
  const [passwordActual, setPasswordActual] = useState("");
  const [passwordNueva, setPasswordNueva] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (passwordNueva !== confirmar) {
      setError("Las dos contraseñas nuevas no coinciden.");
      return;
    }
    setEnviando(true);
    try {
      await cambiarPassword(passwordActual, passwordNueva);
      onCambiada();
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="login-screen">
      <form className="vacante-form login-card" onSubmit={handleSubmit}>
        <h2 className="login-title">Cambia tu contraseña</h2>
        <p className="login-subtitle">
          Un administrador restableció tu acceso. Antes de continuar, pon una contraseña que solo
          conozcas tú.
        </p>

        {error && <div className="setup-error">{error}</div>}

        <label>Contraseña temporal</label>
        <PasswordInput
          value={passwordActual}
          onChange={(e) => setPasswordActual(e.target.value)}
          autoFocus
          required
        />

        <label>Nueva contraseña</label>
        <PasswordInput
          value={passwordNueva}
          onChange={(e) => setPasswordNueva(e.target.value)}
          minLength={8}
          required
        />

        <label>Confirmar nueva contraseña</label>
        <PasswordInput
          value={confirmar}
          onChange={(e) => setConfirmar(e.target.value)}
          minLength={8}
          required
        />

        <button type="submit" className="primary" disabled={enviando}>
          {enviando ? "Guardando…" : "Cambiar contraseña y continuar"}
        </button>

        {onLogout && (
          <div className="login-forgot">
            <button type="button" className="link-button" onClick={onLogout} disabled={enviando}>
              Cerrar sesión
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
