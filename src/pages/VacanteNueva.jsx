import { useNavigate } from "react-router";
import VacanteForm from "../components/VacanteForm";
import { createVacante } from "../lib/api";

export default function VacanteNueva() {
  const navigate = useNavigate();

  const handleSubmit = async (values) => {
    const creada = await createVacante(values);
    navigate(`/vacantes/${creada._id}`);
  };

  return (
    <div className="page-narrow">
      <button className="detail-back" onClick={() => navigate("/vacantes")}>
        ← Volver a vacantes
      </button>
      <div className="page-header">
        <h2>Nueva vacante</h2>
      </div>
      <VacanteForm onSubmit={handleSubmit} submitLabel="Crear vacante" />
    </div>
  );
}
