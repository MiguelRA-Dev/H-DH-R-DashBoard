import { useNavigate } from "react-router";
import ScoreBadge from "./ScoreBadge";
import StatusSelect from "./StatusSelect";

function formatFecha(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function TabSwitchIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M7 11v1.5A1.5 1.5 0 0 0 8.5 14H13a1.5 1.5 0 0 0 1.5-1.5V8a1.5 1.5 0 0 0-1.5-1.5h-1.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function AlertTriangleIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M8 2.5 14.5 13.5h-13L8 2.5Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M8 7v2.8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="8" cy="11.6" r="0.9" fill="currentColor" />
    </svg>
  );
}

// Resumen visual de las señales anti-trampa (ver README): cambios de
// pestaña/ventana detectados en el cliente y sospecha de uso de IA marcada
// por el evaluador. Es solo una pista para revisar, nunca reemplaza el
// veredicto humano.
function AlertBadges({ alertas }) {
  if (!alertas || (!alertas.cambiosPantalla && !alertas.posibleUsoIA)) {
    return <span className="cell-muted">—</span>;
  }
  return (
    <>
      {alertas.cambiosPantalla > 0 && (
        <span
          className="alert-badge alert-badge-warning"
          title="Veces que el candidato salió de la pestaña/ventana durante la entrevista"
        >
          <TabSwitchIcon />
          {alertas.cambiosPantalla}
        </span>
      )}
      {alertas.posibleUsoIA && (
        <span className="alert-badge alert-badge-danger" title={alertas.justificacionUsoIA}>
          <AlertTriangleIcon />
          Posible uso de IA
        </span>
      )}
    </>
  );
}

export default function InterviewsTable({ entrevistas, onStatusChange }) {
  const navigate = useNavigate();

  if (entrevistas.length === 0) {
    return <div className="empty-state">No hay entrevistas que coincidan con los filtros.</div>;
  }

  return (
    <div className="table-scroll">
      <table className="interviews-table">
        <thead>
          <tr>
            <th>Candidato</th>
            <th>Vacante</th>
            <th>Resultado IA</th>
            <th>Alertas</th>
            <th>Estado</th>
            <th>Fecha</th>
          </tr>
        </thead>
        <tbody>
          {entrevistas.map((entrevista) => (
            <tr key={entrevista._id} onClick={() => navigate(`/entrevistas/${entrevista._id}`)}>
              <td>{entrevista.candidato}</td>
              <td className="cell-muted">
                {entrevista.vacante}
                {!entrevista.vacanteId && (
                  <span className="unlinked-badge" title="Sin vincular a una vacante por id">
                    sin vincular
                  </span>
                )}
              </td>
              <td>
                <ScoreBadge aprobado={entrevista.aprobado} puntaje={entrevista.puntaje} />
              </td>
              <td>
                <AlertBadges alertas={entrevista.alertas} />
              </td>
              <td>
                <StatusSelect
                  value={entrevista.estadoProceso}
                  onChange={(estado) => onStatusChange(entrevista._id, estado)}
                />
              </td>
              <td className="cell-muted">{formatFecha(entrevista.creadoEn)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
