// Pantalla bloqueante: la cuenta existe y la contraseña es correcta, pero un
// admin no le tiene asignada una licencia (ver Usuarios.jsx) — mismo patrón
// que CambiarPasswordForzado.jsx, pero sin formulario, solo salida.
export default function SinLicencia({ onLogout }) {
  return (
    <div className="login-screen">
      <div className="vacante-form login-card">
        <h2 className="login-title">Sin licencia asignada</h2>
        <p className="login-subtitle">
          Tu cuenta existe pero todavía no tiene una licencia asignada, así que no puedes entrar al
          dashboard. Pídele a un administrador de tu organización que te la asigne desde la pestaña
          "Usuarios" — en cuanto lo haga, vuelve a iniciar sesión.
        </p>

        <button type="button" className="primary" onClick={onLogout}>
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
