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

export const IDIOMAS = [
  { value: "es", label: "Español" },
  { value: "en", label: "Inglés" },
];

const IDIOMA_LABELS = Object.fromEntries(IDIOMAS.map((i) => [i.value, i.label]));

export function formatIdioma(value) {
  return IDIOMA_LABELS[value] || IDIOMA_LABELS.es;
}
