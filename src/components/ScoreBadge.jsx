export default function ScoreBadge({ aprobado, puntaje }) {
  return (
    <span className={`score-badge ${aprobado ? "pass" : "fail"}`}>
      {aprobado ? "Aprobado" : "Rechazado"} · {puntaje}
    </span>
  );
}
