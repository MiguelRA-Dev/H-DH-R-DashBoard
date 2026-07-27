import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import ScoreBadge from "../components/ScoreBadge";
import Select from "../components/Select";
import DateRangeFilter from "../components/DateRangeFilter";
import { ESTADOS_PROCESO } from "../components/StatusSelect";
import { getStats, getEntrevistas, patchEntrevista } from "../lib/api";

export default function Pipeline() {
  const navigate = useNavigate();
  const [vacantesDisponibles, setVacantesDisponibles] = useState([]);
  const [vacante, setVacante] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [entrevistas, setEntrevistas] = useState(null);
  const [error, setError] = useState(null);
  const [dragId, setDragId] = useState(null);
  const [dragOverCol, setDragOverCol] = useState(null);

  useEffect(() => {
    getStats()
      .then((s) => setVacantesDisponibles((s.porVacante || []).map((v) => v.vacante).filter(Boolean)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setEntrevistas(null);
    setError(null);
    getEntrevistas({ vacante, desde, hasta, pageSize: 100 })
      .then((res) => setEntrevistas(res.items))
      .catch((err) => setError(err.message));
  }, [vacante, desde, hasta]);

  const vacanteOptions = useMemo(
    () => [
      { value: "", label: "Todas las vacantes" },
      ...vacantesDisponibles.map((v) => ({ value: v, label: v })),
    ],
    [vacantesDisponibles]
  );

  const moverA = async (id, estadoProceso) => {
    setEntrevistas((items) =>
      items.map((e) => (e._id === id ? { ...e, estadoProceso } : e))
    );
    try {
      await patchEntrevista(id, { estadoProceso });
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDrop = (estadoProceso) => (e) => {
    e.preventDefault();
    setDragOverCol(null);
    const id = e.dataTransfer.getData("text/plain");
    if (id) moverA(id, estadoProceso);
  };

  return (
    <>
      <div className="page-header">
        <h2>Pipeline de candidatos</h2>
      </div>

      <div className="filters-row">
        <Select
          className="filter-select"
          value={vacante}
          options={vacanteOptions}
          onChange={setVacante}
        />
        <DateRangeFilter desde={desde} hasta={hasta} onDesdeChange={setDesde} onHastaChange={setHasta} />
      </div>

      {!vacante && (
        <p className="pipeline-hint">
          Viendo todas las vacantes. Con muchos candidatos, filtra por una vacante específica arriba
          para un tablero más manejable.
        </p>
      )}

      {error && <div className="error-state">⚠️ {error}</div>}
      {!entrevistas && !error && <div className="loading-state">Cargando pipeline…</div>}

      {entrevistas && !error && (
        <div className="kanban-board">
          {ESTADOS_PROCESO.map((estado) => {
            const items = entrevistas.filter(
              (e) => (e.estadoProceso || "pendiente") === estado.value
            );
            return (
              <div
                key={estado.value}
                className={`kanban-column ${dragOverCol === estado.value ? "drag-over" : ""}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverCol(estado.value);
                }}
                onDragLeave={() => setDragOverCol((c) => (c === estado.value ? null : c))}
                onDrop={handleDrop(estado.value)}
              >
                <div className="kanban-column-header">
                  <span>{estado.label}</span>
                  <span className="kanban-count">{items.length}</span>
                </div>

                <div className="kanban-cards">
                  {items.length === 0 && <div className="kanban-empty">Sin candidatos</div>}
                  {items.map((e) => (
                    <div
                      key={e._id}
                      className={`kanban-card ${dragId === e._id ? "dragging" : ""}`}
                      draggable
                      onDragStart={(ev) => {
                        ev.dataTransfer.setData("text/plain", e._id);
                        setDragId(e._id);
                      }}
                      onDragEnd={() => setDragId(null)}
                      onClick={() => navigate(`/entrevistas/${e._id}`)}
                    >
                      <p className="kanban-card-name">{e.candidato}</p>
                      {!vacante && <p className="kanban-card-vacante">{e.vacante}</p>}
                      <ScoreBadge aprobado={e.aprobado} puntaje={e.puntaje} />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
