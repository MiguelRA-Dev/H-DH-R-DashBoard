import Select from "./Select";

export const ESTADOS_PROCESO = [
  { value: "pendiente", label: "Pendiente" },
  { value: "en_revision", label: "En revisión" },
  { value: "contratado", label: "Contratado" },
  { value: "descartado", label: "Descartado" },
];

export default function StatusSelect({ value, onChange }) {
  const actual = value || "pendiente";
  return (
    <div className="status-select-wrap" onClick={(e) => e.stopPropagation()}>
      <Select
        className={`status-select status-${actual}`}
        value={actual}
        options={ESTADOS_PROCESO}
        onChange={onChange}
      />
    </div>
  );
}
