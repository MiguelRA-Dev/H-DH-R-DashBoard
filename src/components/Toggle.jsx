// Switch on/off reutilizable — se usa para "licencia asignada" (al crear una
// persona y en su fila en la lista), en vez de un checkbox nativo o un botón
// de texto para la misma idea en dos lugares distintos.
export default function Toggle({ checked, onChange, disabled, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      className={`toggle ${checked ? "on" : ""}`}
      onClick={() => onChange(!checked)}
    >
      <span className="toggle-thumb" />
    </button>
  );
}
