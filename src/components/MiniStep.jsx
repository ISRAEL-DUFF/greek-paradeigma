import { C } from "../theme.js";

export default function MiniStep({ value, min, max, onChange }) {
  return (
    <span className="inline-flex items-center gap-1">
      <button
        onClick={() => onChange(Math.max(min, value - 1))}
        className="px-1.5 rounded"
        style={{ border: `1px solid ${C.line}`, color: C.faint }}
      >
        ‹
      </button>
      <span style={{ color: C.marble, minWidth: "1.2em", textAlign: "center" }}>{value}</span>
      <button
        onClick={() => onChange(Math.min(max, value + 1))}
        className="px-1.5 rounded"
        style={{ border: `1px solid ${C.line}`, color: C.faint }}
      >
        ›
      </button>
    </span>
  );
}
