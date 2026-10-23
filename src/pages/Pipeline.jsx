import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import ScoreBadge from "../components/ScoreBadge";
import Select from "../components/Select";
import DateRangeFilter from "../components/DateRangeFilter";
import ErrorState from "../components/ErrorState";
import { ESTADOS_PROCESO } from "../components/StatusSelect";
import { getStats, getEntrevistas, patchEntrevista } from "../lib/api";

// Umbral de movimiento antes de considerar que es un arrastre y no un tap/clic
// normal — sin esto, cualquier toque con el dedo (que nunca está 100%
// quieto) se interpretaría como el inicio de un drag.
const DRAG_THRESHOLD = 6;

export default function Pipeline() {
  const navigate = useNavigate();
  const [vacantesDisponibles, setVacantesDisponibles] = useState([]);
  const [vacante, setVacante] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [entrevistas, setEntrevistas] = useState(null);
  const [error, setError] = useState(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [dragId, setDragId] = useState(null);
  const [dragOverCol, setDragOverCol] = useState(null);
  const retry = () => setReloadToken((t) => t + 1);

  // Estado del arrastre en curso (mouse o touch, vía Pointer Events — el
  // HTML5 Drag and Drop API nativo no dispara en pantallas táctiles). Vive en
  // un ref porque se actualiza en cada pixel de movimiento y no necesita
  // re-renderizar React; lo que sí re-renderiza es dragId/dragOverCol de arriba,
  // solo cuando cambia de verdad.
  const dragState = useRef(null);
  // true justo después de soltar un arrastre real: el click nativo que el
  // navegador dispara a continuación lo lee y se ignora una sola vez. Vive
  // aparte del estado de React a propósito — si dependiera de dragId/dragging
  // en el render, el re-render que dispara el propio soltar ya habría puesto
  // dragId en null antes de que el evento "click" llegue, y la supresión
  // fallaría justo cuando más se necesita.
  const justDraggedRef = useRef(false);

  useEffect(() => {
    getStats()
      .then((s) => setVacantesDisponibles((s.porVacante || []).map((v) => v.vacante).filter(Boolean)))
      .catch(() => {});
  }, [reloadToken]);

  useEffect(() => {
    setEntrevistas(null);
    setError(null);
    getEntrevistas({ vacante, desde, hasta, pageSize: 100 })
      .then((res) => setEntrevistas(res.items))
      .catch((err) => setError(err.message));
  }, [vacante, desde, hasta, reloadToken]);

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

  const resetDragVisual = () => {
    const st = dragState.current;
    if (st?.el) {
      st.el.style.transform = "";
      st.el.style.pointerEvents = "";
      st.el.style.zIndex = "";
      st.el.classList.remove("dragging");
    }
    dragState.current = null;
    setDragId(null);
    setDragOverCol(null);
  };

  const handlePointerDown = (id) => (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const el = e.currentTarget;
    dragState.current = { id, pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, el, moved: false };
    el.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    const st = dragState.current;
    if (!st || e.pointerId !== st.pointerId) return;
    const dx = e.clientX - st.startX;
    const dy = e.clientY - st.startY;

    if (!st.moved && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
      st.moved = true;
      setDragId(st.id);
      st.el.classList.add("dragging");
      st.el.style.zIndex = "50";
      st.el.style.pointerEvents = "none";
    }
    if (!st.moved) return;

    st.el.style.transform = `translate(${dx}px, ${dy}px)`;
    const under = document.elementFromPoint(e.clientX, e.clientY);
    const col = under?.closest(".kanban-column");
    setDragOverCol(col?.dataset.estado || null);
  };

  const handlePointerUp = (e) => {
    const st = dragState.current;
    if (!st || e.pointerId !== st.pointerId) return;
    if (st.moved) {
      const under = document.elementFromPoint(e.clientX, e.clientY);
      const col = under?.closest(".kanban-column");
      const estado = col?.dataset.estado;
      if (estado) moverA(st.id, estado);
      justDraggedRef.current = true;
    }
    resetDragVisual();
  };

  const handlePointerCancel = () => resetDragVisual();

  // Toca sin arrastrar = ir al detalle. Si hubo un arrastre real justo antes,
  // se ignora este único click (ver justDraggedRef).
  const handleCardClick = (id) => () => {
    if (justDraggedRef.current) {
      justDraggedRef.current = false;
      return;
    }
    navigate(`/entrevistas/${id}`);
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

      {error && <ErrorState message={error} onRetry={retry} />}
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
                data-estado={estado.value}
                className={`kanban-column ${dragOverCol === estado.value ? "drag-over" : ""}`}
              >
                <div className="kanban-column-header">
                  <span>{estado.label}</span>
                  <span className="kanban-count">{items.length}</span>
                </div>

                <div className="kanban-cards">
                  {items.length === 0 && <div className="kanban-empty">Sin candidatos</div>}
                  {items.map((e) => {
                    const dragging = dragId === e._id;
                    return (
                      <div
                        key={e._id}
                        className={`kanban-card ${dragging ? "dragging" : ""}`}
                        onPointerDown={handlePointerDown(e._id)}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        onPointerCancel={handlePointerCancel}
                        onClick={handleCardClick(e._id)}
                      >
                        <p className="kanban-card-name">{e.candidato}</p>
                        {!vacante && <p className="kanban-card-vacante">{e.vacante}</p>}
                        <ScoreBadge aprobado={e.aprobado} puntaje={e.puntaje} />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
