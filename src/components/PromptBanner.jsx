import { C } from "../theme.js";
import { ROLE_SHORT } from "../grading.js";

/* ---------- the ask banner ----------
   Pinned directly above the chip tray so the instruction is always in view at
   the moment of answering, and — during an assembly — showing which morpheme
   is wanted next rather than only naming the cell. */
export default function PromptBanner({ label, tableShort, twinMode, assembly, refusal }) {
  const steps = assembly
    ? assembly.expected.map((pc) => ROLE_SHORT[pc.role] ?? pc.role)
    : null;
  return (
    <div
      className="prompt-in w-full rounded-xl px-4 py-3 mb-3"
      style={{ background: C.panel, border: `1px solid ${C.line}` }}
    >
      <div className="flex items-baseline gap-3 flex-wrap">
        <span
          className="px-2 py-0.5 rounded text-xs shrink-0"
          style={{
            background: assembly ? C.aegeanDeep : "transparent",
            border: `1px solid ${C.aegean}`,
            color: assembly ? "#fff" : C.aegean,
            letterSpacing: "0.12em",
          }}
        >
          {assembly ? "ASSEMBLE" : "BUILD"}
        </span>
        <span className="text-lg" style={{ color: C.marble }}>
          {label}
        </span>
        {twinMode && tableShort && (
          <span className="gk text-sm" style={{ color: C.aegean }}>
            {tableShort}
          </span>
        )}
      </div>

      {steps && (
        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
          {steps.map((s, i) => {
            const done = i < assembly.progress;
            const live = i === assembly.progress;
            return (
              <span key={i} className="flex items-center gap-1.5">
                <span
                  className={`px-2 py-0.5 rounded text-xs ${live ? "step-live" : ""}`}
                  style={{
                    border: `1px solid ${live ? C.aegean : done ? C.goldDeep : C.line}`,
                    color: live ? C.aegean : done ? C.gold : C.faint,
                    background: live ? "rgba(111,179,216,0.10)" : "transparent",
                  }}
                >
                  {done ? "✓ " : ""}
                  {s}
                </span>
                {i < steps.length - 1 && <span style={{ color: C.line }}>→</span>}
              </span>
            );
          })}
        </div>
      )}

      {refusal && (
        <div className="mt-2 text-sm toast-in" style={{ color: C.wrong }}>
          {refusal.msg}
        </div>
      )}
    </div>
  );
}
