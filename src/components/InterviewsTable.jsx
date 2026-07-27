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

export default function InterviewsTable({ entrevistas, onStatusChange }) {
  const navigate = useNavigate();

  if (entrevistas.length === 0) {
    return <div className="empty-state">No hay entrevistas que coincidan con los filtros.</div>;
  }

  return (
    <table className="interviews-table">
      <thead>
        <tr>
          <th>Candidato</th>
          <th>Vacante</th>
          <th>Resultado IA</th>
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
  );
}
