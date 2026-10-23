import { useState } from "react";

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path
        d="M1.5 9S4 3.5 9 3.5 16.5 9 16.5 9 14 14.5 9 14.5 1.5 9 1.5 9Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="9" cy="9" r="2.25" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path
        d="M1.5 9S4 3.5 9 3.5c1.47 0 2.73.42 3.77.99M16.5 9s-.82 1.6-2.46 2.95M7.4 7.4a2.25 2.25 0 0 0 3.2 3.2"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M2.5 2.5l13 13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

// Campo de contraseña con botón para mostrarla en texto plano. No cambia nada
// de validación/envío — solo el `type` del input, para que quien escribe
// pueda confirmar que no se equivocó de tecla antes de enviar.
export default function PasswordInput({ value, onChange, className = "", ...rest }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className={`password-input ${className}`}>
      <input type={visible ? "text" : "password"} value={value} onChange={onChange} {...rest} />
      <button
        type="button"
        className="password-toggle"
        tabIndex={-1}
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
      >
        {visible ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </div>
  );
}
