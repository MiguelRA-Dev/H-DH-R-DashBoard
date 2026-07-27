export const MODALIDADES = [
  { value: "", label: "Sin especificar" },
  { value: "presencial", label: "Presencial" },
  { value: "remoto", label: "Remoto" },
  { value: "hibrido", label: "Híbrido" },
];

const MODALIDAD_LABELS = Object.fromEntries(MODALIDADES.map((m) => [m.value, m.label]));

export function formatModalidad(value) {
  return MODALIDAD_LABELS[value] || value || "—";
}
