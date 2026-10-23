export default function ScoreBadge({ aprobado, puntaje }) {
  return (
    <span className={`score-badge ${aprobado ? "pass" : "fail"}`}>
      <span className="score-dot" />
      {aprobado ? "Aprobado" : "Rechazado"}
      <span className="score-value">· {puntaje}</span>
    </span>
  );
}
