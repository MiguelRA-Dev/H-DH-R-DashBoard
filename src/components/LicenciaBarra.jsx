// Barra de uso de licencias (admin/reclutador) — la usan tanto el panel de
// superadmin (viendo todas las organizaciones) como la vista del cliente
// (viendo solo la suya propia), mismo componente en los dos lados.
export default function LicenciaBarra({ label, uso, cupo }) {
  const porcentaje = cupo > 0 ? Math.min(100, Math.round((uso / cupo) * 100)) : 0;
  const lleno = cupo > 0 && uso >= cupo;
  return (
    <div className="licencia-barra-wrap">
      <div className="licencia-barra-label">
        <span>{label}</span>
        <span className={lleno ? "licencia-barra-lleno" : ""}>
          {uso} / {cupo}
        </span>
      </div>
      <div className="licencia-barra-track">
        <div className="licencia-barra-fill" style={{ width: `${porcentaje}%` }} />
      </div>
    </div>
  );
}
