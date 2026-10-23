import { useEffect, useId, useRef, useState } from "react";

export default function Select({ value, options, onChange, placeholder, className = "" }) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const ref = useRef(null);
  const listRef = useRef(null);
  const uid = useId();
  const selectedIndex = options.findIndex((o) => o.value === value);
  const selected = options[selectedIndex];

  // Al abrir, el resaltado arranca en la opción ya seleccionada (o la primera)
  // en vez de siempre la primera — así las flechas continúan desde donde ya
  // estás parado, no desde cero cada vez.
  useEffect(() => {
    if (open) setHighlighted(selectedIndex >= 0 ? selectedIndex : 0);
  }, [open, selectedIndex]);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  useEffect(() => {
    if (!open || !listRef.current) return;
    listRef.current.querySelector(`[data-index="${highlighted}"]`)?.scrollIntoView({ block: "nearest" });
  }, [open, highlighted]);

  const commit = (index) => {
    const opt = options[index];
    if (opt) onChange(opt.value);
    setOpen(false);
  };

  // El foco del DOM se queda siempre en el botón disparador (patrón
  // "listbox" estándar de ARIA): las flechas mueven un resaltado visual y
  // aria-activedescendant, no el foco real — así un lector de pantalla sigue
  // anunciando la opción activa sin perder el foco del campo.
  const handleKeyDown = (e) => {
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlighted((i) => Math.min(options.length - 1, i + 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlighted((i) => Math.max(0, i - 1));
        break;
      case "Home":
        e.preventDefault();
        setHighlighted(0);
        break;
      case "End":
        e.preventDefault();
        setHighlighted(options.length - 1);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        commit(highlighted);
        break;
      case "Escape":
        e.preventDefault();
        setOpen(false);
        break;
      case "Tab":
        setOpen(false);
        break;
      default:
        break;
    }
  };

  return (
    <div className={`custom-select ${open ? "open" : ""} ${className}`} ref={ref}>
      <button
        type="button"
        className="custom-select-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-activedescendant={open ? `${uid}-opt-${highlighted}` : undefined}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={handleKeyDown}
      >
        <span>{selected ? selected.label : placeholder}</span>
        <svg
          className="custom-select-chevron"
          width="10"
          height="6"
          viewBox="0 0 10 6"
          fill="none"
        >
          <path
            d="M1 1L5 5L9 1"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <ul className="custom-select-menu" role="listbox" ref={listRef}>
          {options.map((o, i) => (
            <li
              key={o.value}
              id={`${uid}-opt-${i}`}
              data-index={i}
              role="option"
              aria-selected={o.value === value}
              className={[
                o.value === value ? "selected" : "",
                i === highlighted ? "highlighted" : "",
              ].join(" ")}
              onMouseEnter={() => setHighlighted(i)}
              onClick={() => commit(i)}
            >
              {o.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
