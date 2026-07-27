export default function TranscriptView({ transcripcion }) {
  return (
    <div className="transcript">
      {transcripcion.map((turno, i) => (
        <div key={i} className={`transcript-turn ${turno.role === "ai" ? "ai" : "user"}`}>
          {turno.text}
        </div>
      ))}
    </div>
  );
}
