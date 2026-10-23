import { useEffect, useMemo, useState } from "react";
import KpiCard from "../components/KpiCard";
import FiltersBar from "../components/FiltersBar";
import DateRangeFilter from "../components/DateRangeFilter";
import InterviewsTable from "../components/InterviewsTable";
import ErrorState from "../components/ErrorState";
import { getStats, getEntrevistas, patchEntrevista, buildEntrevistasExportUrl } from "../lib/api";

const PAGE_SIZE = 20;

export default function DashboardHome() {
  const [stats, setStats] = useState(null);
  const [resultado, setResultado] = useState({ items: [], total: 0 });
  const [vacante, setVacante] = useState("");
  const [aprobado, setAprobado] = useState("");
  const [q, setQ] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadToken, setReloadToken] = useState(0);
  const retry = () => setReloadToken((t) => t + 1);

  useEffect(() => {
    getStats()
      .then(setStats)
      .catch((err) => setError(err.message));
  }, [reloadToken]);

  // Vuelve a página 1 cuando cambian los filtros (evita quedar en una página vacía).
  useEffect(() => setPage(1), [vacante, aprobado, q, desde, hasta]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getEntrevistas({ vacante, aprobado, q, desde, hasta, page, pageSize: PAGE_SIZE })
      .then(setResultado)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [vacante, aprobado, q, desde, hasta, page, reloadToken]);

  const vacantes = useMemo(
    () => (stats?.porVacante || []).map((v) => v.vacante).filter(Boolean),
    [stats]
  );

  const totalPaginas = Math.max(1, Math.ceil(resultado.total / PAGE_SIZE));

  const handleStatusChange = async (id, estadoProceso) => {
    setResultado((r) => ({
      ...r,
      items: r.items.map((e) => (e._id === id ? { ...e, estadoProceso } : e)),
    }));
    await patchEntrevista(id, { estadoProceso });
  };

  return (
    <>
      <div className="page-header">
        <h2>Entrevistas</h2>
        <a
          className="secondary"
          href={buildEntrevistasExportUrl({ vacante, aprobado, q, desde, hasta })}
        >
          Exportar CSV
        </a>
      </div>

      {stats && (
        <div className="kpi-row">
          <KpiCard label="Entrevistas totales" value={stats.total} accent />
          <KpiCard
            label="Tasa de aprobación"
            value={`${Math.round(stats.tasaAprobacion * 100)}%`}
            accent
          />
          <KpiCard label="Puntaje promedio" value={stats.puntajePromedio.toFixed(1)} accent />
          <KpiCard label="Vacantes activas" value={vacantes.length} accent />
        </div>
      )}

      <div className="filters-row">
        <input
          type="text"
          placeholder="Buscar candidato…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <FiltersBar
          vacantes={vacantes}
          vacante={vacante}
          aprobado={aprobado}
          onVacanteChange={setVacante}
          onAprobadoChange={setAprobado}
        />
        <DateRangeFilter
          desde={desde}
          hasta={hasta}
          onDesdeChange={setDesde}
          onHastaChange={setHasta}
        />
      </div>

      {error && <ErrorState message={error} onRetry={retry} />}
      {loading && !error && <div className="loading-state">Cargando entrevistas…</div>}
      {!loading && !error && (
        <>
          <InterviewsTable entrevistas={resultado.items} onStatusChange={handleStatusChange} />
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
