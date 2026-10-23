import "./LoginOrb.css";

// Mismo avatar visual que el candidato ve en el agente de voz durante la
// entrevista (ver Orb.jsx/Orb.css ahí) — se reutiliza acá en reposo, sin
// estados de conversación, como la pieza visual del login, para que la marca
// sea reconocible entre las dos apps.
export default function LoginOrb() {
  return (
    <div className="login-orb" aria-hidden="true">
      <span className="login-orb-glow" />
      <span className="login-orb-core">
        <span className="login-orb-face">
          <span className="login-orb-eye login-orb-eye-l">
            <span className="login-orb-spark" />
          </span>
          <span className="login-orb-eye login-orb-eye-r">
            <span className="login-orb-spark" />
          </span>
          <span className="login-orb-mouth" />
        </span>
      </span>
      <span className="login-orb-ring" />
    </div>
  );
}
