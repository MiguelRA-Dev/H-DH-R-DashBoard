const MODALIDAD_LABELS = {
  presencial: "Presencial",
  remoto: "Remoto",
  hibrido: "Híbrido",
};

export function formatModalidad(value) {
  return MODALIDAD_LABELS[value] || value || "";
}
