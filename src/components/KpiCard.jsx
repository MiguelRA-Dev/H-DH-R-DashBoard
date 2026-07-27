export default function KpiCard({ label, value, accent }) {
  return (
    <div className="kpi-card">
      <p className="kpi-label">{label}</p>
      <p className={`kpi-value ${accent ? "accent" : ""}`}>{value}</p>
    </div>
  );
}
