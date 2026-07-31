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
          ↩ {alertas.cambiosPantalla}
        </span>
      )}
      {alertas.posibleUsoIA && (
        <span className="alert-badge alert-badge-danger" title={alertas.justificacionUsoIA}>
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
