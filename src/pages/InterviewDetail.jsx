import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import ScoreBadge from "../components/ScoreBadge";
import CompetencyMeters from "../components/CompetencyMeters";
import TranscriptView from "../components/TranscriptView";
import StatusSelect from "../components/StatusSelect";
import NotesEditor from "../components/NotesEditor";
import Select from "../components/Select";
import { getEntrevista, patchEntrevista, getVacantes } from "../lib/api";

export default function InterviewDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [entrevista, setEntrevista] = useState(null);
  const [vacantes, setVacantes] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    setEntrevista(null);
    setError(null);
    getEntrevista(id)
      .then(setEntrevista)
      .catch((err) => setError(err.message));
  }, [id]);

  useEffect(() => {
    getVacantes({ pageSize: 100 })
      .then((res) => setVacantes(res.items))
      .catch(() => {});
  }, []);

  const handleStatusChange = async (estadoProceso) => {
    setEntrevista((e) => ({ ...e, estadoProceso }));
    await patchEntrevista(id, { estadoProceso });
  };

  const handleSaveNotas = async (notas) => {
    const actualizada = await patchEntrevista(id, { notas });
    setEntrevista(actualizada);
  };

  const handleVacanteChange = async (vacanteId) => {
    const actualizada = await patchEntrevista(id, { vacanteId: vacanteId || null });
    setEntrevista(actualizada);
  };

  if (error) return <div className="error-state">⚠️ {error}</div>;
  if (!entrevista) return <div className="loading-state">Cargando entrevista…</div>;

  const vacanteOptions = [
    { value: "", label: "Sin vincular" },
    ...vacantes.map((v) => ({ value: v._id, label: v.titulo })),
  ];

  return (
    <>
      <button className="detail-back" onClick={() => navigate("/")}>
        ← Volver al listado
      </button>

      <div className="detail-header">
        <div>
          <h2>{entrevista.vacante}</h2>
          <p className="detail-candidate">{entrevista.candidato}</p>
        </div>
        <div className="detail-header-actions">
          <ScoreBadge aprobado={entrevista.aprobado} puntaje={entrevista.puntaje} />
          <StatusSelect value={entrevista.estadoProceso} onChange={handleStatusChange} />
        </div>
      </div>

      {(entrevista.alertas?.cambiosPantalla > 0 || entrevista.alertas?.posibleUsoIA) && (
        <div className="detail-card alert-card">
          <h3>Alertas</h3>
          <p className="alert-hint">
            Señales automáticas para revisar con un acercamiento humano — no cambian el veredicto
            de la IA ni el estado del proceso.
          </p>
          <div className="alert-list">
            {entrevista.alertas.cambiosPantalla > 0 && (
              <div className="alert-item alert-item-warning">
                <strong>Cambios de pestaña/ventana:</strong> el candidato salió de la entrevista{" "}
                {entrevista.alertas.cambiosPantalla}{" "}
                {entrevista.alertas.cambiosPantalla === 1 ? "vez" : "veces"} durante la sesión.
              </div>
            )}
            {entrevista.alertas.posibleUsoIA && (
              <div className="alert-item alert-item-danger">
                <strong>Posible uso de IA/internet:</strong>{" "}
                {entrevista.alertas.justificacionUsoIA || "El evaluador detectó respuestas que no se sostuvieron al pedir un ejemplo concreto."}
              </div>
            )}
          </div>
        </div>
      )}

      {(entrevista.cedula || entrevista.celular) && (
        <div className="detail-card contact-card">
          <h3>Contacto</h3>
          <div className="contact-grid">
            <div>
              <span className="contact-label">Cédula</span>
              <span className="contact-value">{entrevista.cedula || "—"}</span>
            </div>
            <div>
              <span className="contact-label">Celular</span>
              <span className="contact-value">
                {entrevista.celular ? (
                  <a href={`tel:${entrevista.celular}`}>{entrevista.celular}</a>
                ) : (
                  "—"
                )}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="detail-card link-vacante-card">
        <h3>Vacante vinculada</h3>
        <Select
          className="link-vacante-select"
          value={entrevista.vacanteId || ""}
          options={vacanteOptions}
          onChange={handleVacanteChange}
        />
        {!entrevista.vacanteId && (
          <p className="link-vacante-hint">
            Esta entrevista solo se relaciona con "{entrevista.vacante}" por texto — vincúlala a una
            vacante real para que aparezca de forma confiable en su ficha y en los filtros.
          </p>
        )}
      </div>

      <div className="detail-grid">
        <div className="detail-card">
          <h3>Transcripción</h3>
          <TranscriptView transcripcion={entrevista.transcripcion} />
        </div>

        <div className="detail-card">
          <h3>Evaluación</h3>

          {entrevista.competencias && (
            <>
              <CompetencyMeters competencias={entrevista.competencias} />
              <div className="detail-card-spacer" />
            </>
          )}

          <p>{entrevista.resumen}</p>

          {entrevista.fortalezas?.length > 0 && (
            <>
              <h3>Fortalezas</h3>
              <ul>
                {entrevista.fortalezas.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            </>
          )}

          {entrevista.areasDeMejora?.length > 0 && (
            <>
              <h3>Áreas de mejora</h3>
              <ul>
                {entrevista.areasDeMejora.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </>
          )}

          <h3>Notas de RRHH</h3>
          <NotesEditor value={entrevista.notas} onSave={handleSaveNotas} />
        </div>
      </div>
    </>
  );
}
