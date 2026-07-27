import Select from "./Select";

export default function FiltersBar({ vacantes, vacante, aprobado, onVacanteChange, onAprobadoChange }) {
  const vacanteOptions = [
    { value: "", label: "Todas las vacantes" },
    ...vacantes.map((v) => ({ value: v, label: v })),
  ];

  const aprobadoOptions = [
    { value: "", label: "Aprobado y rechazado" },
    { value: "true", label: "Solo aprobados" },
    { value: "false", label: "Solo rechazados" },
  ];

  return (
    <div className="filters-bar">
      <Select
        className="filter-select"
        value={vacante}
        options={vacanteOptions}
        onChange={onVacanteChange}
      />
      <Select
        className="filter-select"
        value={aprobado}
        options={aprobadoOptions}
        onChange={onAprobadoChange}
      />
    </div>
  );
}
