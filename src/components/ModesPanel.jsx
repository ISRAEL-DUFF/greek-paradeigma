import { C } from "../theme.js";
import { MODES } from "../content/modes.js";

/* ---------- the modes panel ----------
   A sheet has room for a sentence, which a chip never did — so this is where
   TWIN and IMPOSTOR stop being opaque labels. The words come from
   content/modes.json, not from here: what a learner reads is curriculum.
   Container-agnostic, like TablesPanel. */
export default function ModesPanel({ mode, onPick }) {
  return (
    <div>
      {MODES.map((m) => {
        const on = mode === m.id;
        return (
          <button
            key={m.id}
            onClick={() => onPick(m.id)}
            className="w-full flex items-start gap-3 py-3 text-left"
            style={{ borderBottom: `1px solid ${C.line}` }}
          >
            <span
              className="text-xs shrink-0"
              style={{
                color: on ? C.aegean : C.marble,
                letterSpacing: "0.09em",
                width: "5.5rem",
                paddingTop: "0.1rem",
              }}
            >
              {m.name.toUpperCase()}
            </span>
            {/* The note is the teaching content, so it must stay legible on
                every row — not just the selected one. Hierarchy comes from
                size and weight, never from fading text to the border colour. */}
            <span className="min-w-0 flex-1">
              <span className="block text-sm" style={{ color: C.marble, lineHeight: 1.45 }}>
                {m.description}
              </span>
              <span
                className="block text-xs mt-1"
                style={{ color: on ? C.aegean : C.faint, lineHeight: 1.4 }}
              >
                {m.note}
              </span>
            </span>
            {on && (
              <span className="shrink-0" style={{ color: C.aegean }}>
                ✓
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
