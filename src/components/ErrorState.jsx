export default function ErrorState({ message, onRetry }) {
  return (
    <div className="error-state">
      <p>⚠️ {message}</p>
      {onRetry && (
        <button type="button" className="secondary" onClick={onRetry}>
          Reintentar
        </button>
      )}
    </div>
  );
}
