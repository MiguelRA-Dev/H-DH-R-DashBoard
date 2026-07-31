const EJES = [
  { key: "conocimientoTecnico", label: "Conocimiento técnico" },
  { key: "comunicacion", label: "Comunicación" },
  { key: "resolucionProblemas", label: "Resolución de problemas" },
  { key: "fitRol", label: "Fit con el rol" },
];

// Mismo umbral que UMBRAL_APROBACION en el agente de voz (server/entrevistaLogica.js):
// >=70 se lee como fuerte, 40-69 como parcial, por debajo como débil.
function severidad(valor) {
  if (valor >= 70) return "good";
  if (valor >= 40) return "warning";
  return "danger";
}

export default function CompetencyMeters({ competencias }) {
  if (!competencias) return null;

  return (
    <div className="competency-meters">
      {EJES.map(({ key, label }) => {
        const valor = Number(competencias[key]) || 0;
        return (
          <div className="competency-row" key={key}>
            <div className="competency-row-header">
              <span className="competency-label">{label}</span>
              <span className="competency-value">{valor}</span>
            </div>
            <div
              className="competency-track"
              role="meter"
              aria-label={label}
              aria-valuenow={valor}
              aria-valuemin={0}
              aria-valuemax={100}
              title={`${label}: ${valor}/100`}
            >
              <div
                className={`competency-fill competency-fill-${severidad(valor)}`}
                style={{ width: `${Math.max(0, Math.min(100, valor))}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
