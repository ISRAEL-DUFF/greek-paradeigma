import { C } from "../theme.js";

/* ---------- the drill HUD ----------
   Race clock and mode prompts were second-class citizens (tiny text-sm lines
   the eye skated past). These two components give every mode's "what do I do
   and how long do I have" the same visual rank as the ask banner. */

/** The row-race clock: a draining ring with the seconds large in its center.
    Calm aegean above 20s, gold as the middle third burns, alarm-red with a
    pulse under 10s. */
export function RaceClock({ msLeft, totalMs, bestMs }) {
  const frac = Math.max(0, Math.min(1, msLeft / totalMs));
  const R = 30;
  const CIRC = 2 * Math.PI * R;
  const secs = Math.max(0, msLeft / 1000);
  const low = msLeft < 10000;
  const mid = !low && msLeft < 20000;
  const color = low ? C.wrong : mid ? C.gold : C.aegean;
  return (
    <div className="w-full max-w-2xl mb-3 flex items-center gap-4">
      <div
        className={`relative shrink-0 ${low ? "hud-low" : ""}`}
        style={{ width: 76, height: 76 }}
        role="timer"
        aria-label={`${secs.toFixed(0)} seconds left`}
      >
        <svg width="76" height="76" viewBox="0 0 76 76" style={{ transform: "rotate(-90deg)" }}>
          <circle cx="38" cy="38" r={R} fill="none" stroke={C.line} strokeWidth="5" />
          <circle
            cx="38" cy="38" r={R} fill="none"
            stroke={color} strokeWidth="5" strokeLinecap="round"
            strokeDasharray={CIRC}
            strokeDashoffset={CIRC * (1 - frac)}
            className="hud-ring"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className="text-2xl font-semibold"
            style={{ color, fontVariantNumeric: "tabular-nums" }}
          >
            {secs.toFixed(low ? 1 : 0)}
          </span>
        </div>
      </div>
      <div className="min-w-0">
        <div className="text-xs tracking-[0.18em]" style={{ color: C.faint }}>
          ROW RACE
        </div>
        <div className="text-sm sm:text-base" style={{ color: low ? C.wrong : C.marble }}>
          {low ? "the clock is breathing down your neck" : "the whole table, column by column"}
        </div>
        {bestMs != null && (
          <div className="text-xs" style={{ color: C.gold }}>
            best {(bestMs / 1000).toFixed(1)}s
          </div>
        )}
      </div>
    </div>
  );
}

/** A first-class instruction banner for the modes whose ask used to be a
    whisper (Impostor, Lookup). Same visual grammar as the ask banner: mode
    tag + the instruction at reading size, with a colored accent edge. */
export function ModePrompt({ tag, tone = "aegean", sub, children }) {
  const accent = tone === "wrong" ? C.wrong : tone === "gold" ? C.gold : C.aegean;
  return (
    <div
      className="prompt-in w-full max-w-2xl rounded-xl px-4 py-3 mb-3"
      style={{
        background: C.panel,
        border: `1px solid ${C.line}`,
        borderLeft: `4px solid ${accent}`,
      }}
    >
      <div className="flex items-center gap-3 flex-wrap">
        <span
          className="px-2 py-0.5 rounded text-xs shrink-0"
          style={{ border: `1px solid ${accent}`, color: accent, letterSpacing: "0.12em" }}
        >
          {tag}
        </span>
        <span className="text-base sm:text-lg" style={{ color: C.marble }}>
          {children}
        </span>
      </div>
      {sub && (
        <div className="mt-1 text-sm" style={{ color: C.faint }}>
          {sub}
        </div>
      )}
    </div>
  );
}


/** The reward signal. streak / fast-bonus used to be the smallest text on
    screen (text-xs, right-aligned) — the one thing the app says when you do
    well should not be its quietest voice. Now a pill that arrives with a
    pop. */
export function SuccessRibbon({ streak, fast, fastLabel }) {
  if (!(streak > 1) && !fast) return null;
  return (
    <div className="w-full max-w-2xl flex gap-2 justify-end pt-2">
      {streak > 1 && (
        <span
          key={streak}
          className="ribbon-pop px-3 py-1 rounded-full text-sm"
          style={{
            border: `1px solid ${C.aegean}`,
            color: C.aegean,
            background: "rgba(111,179,216,0.10)",
          }}
        >
          streak ×{streak}
        </span>
      )}
      {fast && (
        <span
          className="ribbon-pop px-3 py-1 rounded-full text-sm"
          style={{
            border: `1px solid ${C.gold}`,
            color: C.gold,
            background: "rgba(217,188,114,0.12)",
          }}
        >
          {fastLabel} +2
        </span>
      )}
    </div>
  );
}
