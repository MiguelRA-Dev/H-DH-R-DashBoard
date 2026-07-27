import { useState } from "react";

export default function NotesEditor({ value, onSave }) {
  const [notas, setNotas] = useState(value || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const dirty = notas !== (value || "");

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await onSave(notas);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="notes-editor">
      <textarea
        value={notas}
        onChange={(e) => {
          setNotas(e.target.value);
          setSaved(false);
        }}
        placeholder="Notas internas de RRHH sobre este candidato…"
        rows={4}
      />
      <div className="notes-editor-actions">
        <button className="secondary" onClick={handleSave} disabled={!dirty || saving}>
          {saving ? "Guardando…" : "Guardar notas"}
        </button>
        {saved && !dirty && <span className="notes-saved">Guardado</span>}
      </div>
    </div>
  );
}
