import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import Select from "../components/Select";
import DateRangeFilter from "../components/DateRangeFilter";
import ErrorState from "../components/ErrorState";
import { getVacantes, buildVacantesExportUrl } from "../lib/api";
import { formatModalidad } from "../lib/vacanteLabels";

const PAGE_SIZE = 20;

const ESTADO_OPTIONS = [
  { value: "", label: "Todos los estados" },
  { value: "abierta", label: "Abierta" },
  { value: "pausada", label: "Pausada" },
  { value: "cerrada", label: "Cerrada" },
];

export default function VacantesList() {
  const [resultado, setResultado] = useState({ items: [], total: 0 });
  const [q, setQ] = useState("");
  const [estado, setEstado] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadToken, setReloadToken] = useState(0);
  const navigate = useNavigate();
  const retry = () => setReloadToken((t) => t + 1);

  useEffect(() => setPage(1), [q, estado, desde, hasta]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getVacantes({ q, estado, desde, hasta, page, pageSize: PAGE_SIZE })
      .then(setResultado)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [q, estado, desde, hasta, page, reloadToken]);

  const totalPaginas = Math.max(1, Math.ceil(resultado.total / PAGE_SIZE));

  return (
    <>
      <div className="page-header">
        <h2>Vacantes</h2>
        <div className="page-header-actions">
          <a className="secondary" href={buildVacantesExportUrl({ q, estado, desde, hasta })}>
            Exportar CSV
          </a>
          <button className="primary compact" onClick={() => navigate("/vacantes/nueva")}>
            + Nueva vacante
          </button>
        </div>
      </div>

      <div className="filters-row">
        <input
          type="text"
          placeholder="Buscar vacante…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <Select
          className="filter-select"
          value={estado}
          options={ESTADO_OPTIONS}
          onChange={setEstado}
        />
        <DateRangeFilter desde={desde} hasta={hasta} onDesdeChange={setDesde} onHastaChange={setHasta} />
      </div>

      {error && <ErrorState message={error} onRetry={retry} />}
      {loading && !error && <div className="loading-state">Cargando vacantes…</div>}

      {!loading && !error && resultado.items.length === 0 && (
        <div className="empty-state">No hay vacantes que coincidan con los filtros.</div>
      )}

      {!loading && !error && resultado.items.length > 0 && (
        <>
          <div className="table-scroll">
            <table className="interviews-table">
              <thead>
                <tr>
                  <th>Título</th>
                  <th>Departamento</th>
                  <th>Modalidad</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {resultado.items.map((v) => (
                  <tr key={v._id} onClick={() => navigate(`/vacantes/${v._id}`)}>
                    <td>{v.titulo}</td>
                    <td className="cell-muted">{v.departamento || "—"}</td>
                    <td className="cell-muted">{formatModalidad(v.modalidad)}</td>
                    <td>
                      <span className={`vacante-estado estado-${v.estado}`}>{v.estado}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {resultado.total > PAGE_SIZE && (
            <div className="pagination">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                ← Anterior
              </button>
              <span>
                Página {page} de {totalPaginas}
              </span>
              <button disabled={page >= totalPaginas} onClick={() => setPage((p) => p + 1)}>
                Siguiente →
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}
