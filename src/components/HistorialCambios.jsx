import { ESTADOS_PROCESO } from "./StatusSelect";
import { formatIdioma } from "../lib/vacanteLabels";

const ESTADO_LABEL = Object.fromEntries(ESTADOS_PROCESO.map((e) => [e.value, e.label]));

const CAMPO_LABEL = {
  // Entrevistas
  estadoProceso: "el estado",
  notas: "las notas",
  vacante: "la vacante vinculada",
  // Vacantes
  titulo: "el título",
  descripcion: "la descripción",
  departamento: "el departamento",
  ubicacion: "la ubicación",
  modalidad: "la modalidad",
  tipoContrato: "el tipo de contrato",
  requisitos: "los requisitos",
  idioma: "el idioma de la entrevista",
  estado: "el estado",
};

// Campos de texto largo: el backend no guarda el valor antes/después acá
// (ver api/entrevistas/[id].js y api/vacantes/[id].js), solo que cambiaron.
const CAMPOS_SIN_VALOR = ["notas", "descripcion", "requisitos"];

function formatValor(campo, valor) {
  if (valor === null || valor === undefined || valor === "") return "—";
  if (campo === "estadoProceso") return ESTADO_LABEL[valor] || valor;
  if (campo === "idioma") return formatIdioma(valor);
  return valor;
}

function formatFecha(iso) {
  return new Date(iso).toLocaleString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Solo para admin (ver InterviewDetail): quién cambió qué y cuándo, en toda
// entrevista — hoy estadoProceso/notas/vacanteId se sobreescribían en
// silencio, sin dejar rastro de quién lo hizo.
export default function HistorialCambios({ historial }) {
  if (!historial || historial.length === 0) {
    return <p className="cell-muted">Todavía no hay cambios registrados.</p>;
  }

  const ordenado = [...historial].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  return (
    <ul className="historial-list">
      {ordenado.map((h, i) => (
        <li key={i} className="historial-item">
          <span className="historial-texto">
            <strong>{h.usuarioNombre}</strong> cambió {CAMPO_LABEL[h.campo] || h.campo}
            {!CAMPOS_SIN_VALOR.includes(h.campo) && (
              <>
                {" "}
                de <strong>{formatValor(h.campo, h.valorAnterior)}</strong> a{" "}
                <strong>{formatValor(h.campo, h.valorNuevo)}</strong>
              </>
            )}
          </span>
          <span className="historial-fecha">{formatFecha(h.fecha)}</span>
        </li>
      ))}
    </ul>
  );
}
