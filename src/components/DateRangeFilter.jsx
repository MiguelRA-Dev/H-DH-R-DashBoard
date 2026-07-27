export default function DateRangeFilter({ desde, hasta, onDesdeChange, onHastaChange }) {
  return (
    <div className="date-range-filter">
      <input
        type="date"
        value={desde || ""}
        onChange={(e) => onDesdeChange(e.target.value)}
        aria-label="Desde"
      />
      <span className="date-range-sep">→</span>
      <input
        type="date"
        value={hasta || ""}
        onChange={(e) => onHastaChange(e.target.value)}
        aria-label="Hasta"
        min={desde || undefined}
      />
    </div>
  );
}
