// Barra de uso de licencias (admin/reclutador) — la usan tanto el panel de
// superadmin (viendo todas las organizaciones) como la vista del cliente
// (viendo solo la suya propia), mismo componente en los dos lados.
export default function LicenciaBarra({ label, uso, cupo }) {
  // Sobre cupo: más gente licenciada que el cupo contratado — pasa cuando el
  // superadmin baja el cupo después de que ya había gente licenciada (ver
  // scripts/migrar-licencias-asignadas.js). Antes esto solo se detectaba si
  // cupo > 0, así que con cupo exactamente en 0 (como al probarlo a propósito)
  // nunca se marcaba como sobre cupo y la barra se veía vacía en vez de llena.
  const sobreCupo = uso > cupo;
  const lleno = uso >= cupo && cupo > 0;
  const porcentaje = cupo > 0 ? Math.min(100, Math.round((uso / cupo) * 100)) : uso > 0 ? 100 : 0;

  return (
    <div className="licencia-barra-wrap">
      <div className="licencia-barra-label">
        <span>{label}</span>
        <span className={sobreCupo ? "licencia-barra-sobre-cupo" : lleno ? "licencia-barra-lleno" : ""}>
          {uso} / {cupo}
          {sobreCupo && " · sobre cupo"}
        </span>
      </div>
      <div className="licencia-barra-track">
        <div
          className={`licencia-barra-fill ${sobreCupo ? "sobre-cupo" : ""}`}
          style={{ width: `${porcentaje}%` }}
        />
      </div>
    </div>
  );
}
