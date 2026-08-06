import { C } from "../theme.js";
import { siblingModes } from "../content/modes.js";

/* ---------- round end ----------
   One screen for every mode that ends. Before this, "what now?" was answered
   four different ways in four different places — inline under the table for
   Fill, a separate block for Twin, inside the clock row for Race, and on the
   pinned bar for Scramble.

   It is also the honest place to offer a different mode: you choose what to
   play next when something FINISHES, not from a permanent rack of chips. That
   is why the mode pill moved into a sheet in Phase 2 and this screen exists. */
export default function RoundEnd({ mode, tone, headline, message, primary, secondary, onPickMode, raceBest }) {
  const accent = tone === "gold" ? C.gold : tone === "wrong" ? C.wrong : C.aegean;
  const siblings = siblingModes(mode);

  return (
    <div
      data-test="round-end"
      className="w-full max-w-2xl mt-4 rounded-2xl p-5 rise"
      style={{ background: C.panel, border: `1px solid ${tone === "gold" ? C.goldDeep : C.line}` }}
    >
      <div className="text-xs" style={{ color: accent, letterSpacing: "0.13em" }}>
        {headline}
      </div>
      {message && (
        <div className="text-sm mt-1.5" style={{ color: C.marble, lineHeight: 1.5 }}>
          {message}
        </div>
      )}

      <div className="flex gap-2 mt-4 flex-wrap">
        {primary && (
          <button
            onClick={primary.onClick}
            className="px-4 py-2.5 rounded-xl text-sm"
            style={{
              background: tone === "gold" ? "transparent" : C.aegeanDeep,
              border: `1px solid ${tone === "gold" ? C.goldDeep : C.aegean}`,
              color: tone === "gold" ? C.gold : "#fff",
            }}
          >
            {primary.label}
          </button>
        )}
        {secondary && (
          <button
            onClick={secondary.onClick}
            className="px-4 py-2.5 rounded-xl text-sm"
            style={{ background: "transparent", border: `1px solid ${C.line}`, color: C.faint }}
          >
            {secondary.label}
          </button>
        )}
      </div>

      {siblings.length > 0 && (
        <>
          {/* C.faint, not C.line — a label rendered in the border colour is
              the same near-invisible mistake fixed in ModesPanel. */}
          <div className="text-xs mt-5 mb-2" style={{ color: C.faint, letterSpacing: "0.1em" }}>
            OR TRY THIS TABLE AS
          </div>
          <div className="flex gap-2 flex-wrap">
            {siblings.map((m) => (
              <button
                key={m.id}
                onClick={() => onPickMode(m.id)}
                title={m.description}
                className="px-3 py-1.5 rounded-full text-xs"
                style={{ border: `1px solid ${C.line}`, color: C.faint }}
              >
                {m.name}
                {/* raceBest has existed in meta since the original Phase 4 and
                    has never been shown anywhere until now. */}
                {m.id === "race" && raceBest != null && (
                  <span style={{ color: C.gold }}> · best {(raceBest / 1000).toFixed(1)}s</span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
