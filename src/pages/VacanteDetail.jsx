import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import VacanteForm from "../components/VacanteForm";
import ScoreBadge from "../components/ScoreBadge";
import { getVacante, updateVacante, deleteVacante, getEntrevistas } from "../lib/api";
import { formatModalidad } from "../lib/vacanteLabels";

const ESTADOS = ["abierta", "pausada", "cerrada"];

export default function VacanteDetail({ usuarioActual }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [vacante, setVacante] = useState(null);
  const [candidatos, setCandidatos] = useState([]);
  const [editando, setEditando] = useState(false);
  const [error, setError] = useState(null);

  const cargar = () => {
    setError(null);
    getVacante(id)
      .then((v) => {
        setVacante(v);
        return getEntrevistas({ vacanteId: v._id, vacante: v.titulo, pageSize: 100 });
      })
      .then((res) => setCandidatos(res.items.sort((a, b) => b.puntaje - a.puntaje)))
      .catch((err) => setError(err.message));
  };

  useEffect(cargar, [id]);

  const handleEdit = async (values) => {
    const actualizada = await updateVacante(id, values);
    setVacante(actualizada);
    setEditando(false);
  };

  const cambiarEstado = async (estado) => {
    const actualizada = await updateVacante(id, { estado });
    setVacante(actualizada);
  };

  const handleDelete = async () => {
    if (!window.confirm(`¿Eliminar la vacante "${vacante.titulo}"? Esta acción no se puede deshacer.`)) {
      return;
    }
    await deleteVacante(id);
    navigate("/vacantes");
  };

  if (error) return <div className="error-state">⚠️ {error}</div>;
  if (!vacante) return <div className="loading-state">Cargando vacante…</div>;

  return (
    <>
      <button className="detail-back" onClick={() => navigate("/vacantes")}>
        ← Volver a vacantes
      </button>

      {editando ? (
        <div className="page-narrow">
          <div className="page-header">
            <h2>Editar vacante</h2>
          </div>
          <VacanteForm initialValues={vacante} onSubmit={handleEdit} submitLabel="Guardar cambios" />
          <button className="detail-back" onClick={() => setEditando(false)}>
            Cancelar
          </button>
        </div>
      ) : (
        <>
          <div className="detail-header">
            <div>
              <h2>{vacante.titulo}</h2>
              <p className="detail-candidate">
                {vacante.departamento || "Sin departamento"} · {vacante.ubicacion || "Sin ubicación"}
                {vacante.modalidad ? ` · ${formatModalidad(vacante.modalidad)}` : ""}
              </p>
            </div>
            <span className={`vacante-estado estado-${vacante.estado}`}>{vacante.estado}</span>
          </div>

          <div className="vacante-actions">
            <button className="secondary" onClick={() => setEditando(true)}>
              Editar
            </button>
            {ESTADOS.filter((e) => e !== vacante.estado).map((estado) => (
              <button key={estado} className="secondary" onClick={() => cambiarEstado(estado)}>
                Marcar como {estado}
              </button>
            ))}
            {usuarioActual?.rol === "admin" && (
              <button className="danger-outline" onClick={handleDelete}>
                Eliminar
              </button>
            )}
          </div>

          {vacante.descripcion && (
            <div className="detail-card">
              <h3>Descripción</h3>
              <p>{vacante.descripcion}</p>
              {vacante.requisitos && (
                <>
                  <h3>Requisitos</h3>
                  <p style={{ whiteSpace: "pre-line" }}>{vacante.requisitos}</p>
                </>
              )}
            </div>
          )}

          <div className="page-header" style={{ marginTop: 28 }}>
            <h3 style={{ margin: 0 }}>Candidatos entrevistados ({candidatos.length})</h3>
          </div>

          {candidatos.length === 0 ? (
            <div className="empty-state">Aún no hay entrevistas registradas para esta vacante.</div>
          ) : (
            <div className="table-scroll">
              <table className="interviews-table">
                <thead>
                  <tr>
                    <th>Candidato</th>
                    <th>Resultado IA</th>
                  </tr>
                </thead>
                <tbody>
                  {candidatos.map((c) => (
                    <tr key={c._id} onClick={() => navigate(`/entrevistas/${c._id}`)}>
                      <td>{c.candidato}</td>
                      <td>
                        <ScoreBadge aprobado={c.aprobado} puntaje={c.puntaje} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </>
  );
}
