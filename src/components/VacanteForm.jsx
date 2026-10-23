import { useState } from "react";
import Select from "./Select";
import { MODALIDADES, IDIOMAS } from "../lib/vacanteLabels";

const CAMPOS_VACIOS = {
  titulo: "",
  descripcion: "",
  departamento: "",
  ubicacion: "",
  modalidad: "",
  tipoContrato: "",
  requisitos: "",
  idioma: "es",
};

export default function VacanteForm({ initialValues, onSubmit, submitLabel }) {
  const [values, setValues] = useState({ ...CAMPOS_VACIOS, ...initialValues });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const setField = (field) => (e) => setValues((v) => ({ ...v, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!values.titulo.trim()) {
      setError("El título de la vacante es obligatorio.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await onSubmit(values);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="vacante-form" onSubmit={handleSubmit}>
      {error && <div className="setup-error">{error}</div>}

      <label>Título de la vacante *</label>
      <input type="text" value={values.titulo} onChange={setField("titulo")} required />

      <label>Descripción</label>
      <textarea value={values.descripcion} onChange={setField("descripcion")} rows={4} />

      <div className="form-row">
        <div>
          <label>Departamento</label>
          <input type="text" value={values.departamento} onChange={setField("departamento")} />
        </div>
        <div>
          <label>Ubicación</label>
          <input type="text" value={values.ubicacion} onChange={setField("ubicacion")} />
        </div>
      </div>

      <div className="form-row">
        <div>
          <label>Modalidad</label>
          <Select
            value={values.modalidad}
            options={MODALIDADES}
            onChange={(modalidad) => setValues((v) => ({ ...v, modalidad }))}
          />
        </div>
        <div>
          <label>Tipo de contrato</label>
          <input
            type="text"
            value={values.tipoContrato}
            onChange={setField("tipoContrato")}
            placeholder="Tiempo completo, medio tiempo…"
          />
        </div>
      </div>

      <label>Requisitos</label>
      <textarea
        value={values.requisitos}
        onChange={setField("requisitos")}
        rows={4}
        placeholder="Un requisito por línea"
      />

      <label>Idioma de la entrevista</label>
      <Select
        value={values.idioma || "es"}
        options={IDIOMAS}
        onChange={(idioma) => setValues((v) => ({ ...v, idioma }))}
      />

      <button type="submit" className="primary" disabled={saving}>
        {saving ? "Guardando…" : submitLabel}
      </button>
    </form>
  );
}
