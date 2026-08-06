import { C, MAX_UNIT, FAST_MS } from "../theme.js";
import { MAX_SHIPPED_UNIT } from "../content/index.js";
import { DECAY_TO_1_MS, DECAY_TO_2_MS } from "../db.js";
import MiniStep from "./MiniStep.jsx";

/* Derived from the real thresholds, never retyped — a hard-coded "4 days" here
   would silently become a lie the moment db.js changed. */
const DAYS = 24 * 60 * 60 * 1000;
const DECAY_SOFT_DAYS = Math.round(DECAY_TO_2_MS / DAYS);
const DECAY_HARD_DAYS = Math.round(DECAY_TO_1_MS / DAYS);

/* ---------- progress & syllabus ----------
   Everything touched weekly or less. The unit gate lives here precisely
   BECAUSE it is global: one mis-tap on the old always-visible stepper silently
   changed what the entire app would show. Phase 4 polishes the presentation;
   Phase 2 moves the controls here so nothing is unreachable in between. */
export default function SettingsPanel({
  currentUnit,
  onChangeUnit,
  syllabus,
  onSaveSyllabus,
  totalGold,
  totalCells,
  accentPct,
  goldTables,
  totalTables,
}) {
  const pct = totalCells > 0 ? (totalGold / totalCells) * 100 : 0;
  return (
    <div>
      <div className="flex gap-7 pt-1 pb-1">
        <Stat label="GILDED" value={totalGold} of={totalCells} tone={C.gold} />
        {accentPct !== null && <Stat label="ACCENTS" value={`${accentPct}%`} />}
        <Stat label="TABLES DONE" value={goldTables} of={totalTables} />
      </div>
      <div className="rounded mt-2 mb-1" style={{ height: 5, background: C.line }}>
        <div
          className="h-full rounded"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${C.goldDeep}, ${C.gold})`,
          }}
        />
      </div>

      <Row
        k="Current unit"
        d="The gate. Nothing above this unit is ever shown or drilled."
        control={
          <MiniStep value={currentUnit} min={1} max={MAX_UNIT} onChange={onChangeUnit} />
        }
      />

      {syllabus ? (
        <>
          <Row
            k="My class is on unit"
            d="Used to plan the sprint, not to gate content."
            control={
              <MiniStep
                value={syllabus.classUnit}
                min={1}
                max={MAX_UNIT}
                onChange={(v) => onSaveSyllabus({ ...syllabus, classUnit: v })}
              />
            }
          />
          <Row
            k="Stay ahead by"
            d="Units of runway you want to keep on the class."
            control={
              <MiniStep
                value={syllabus.lead}
                min={1}
                max={5}
                onChange={(v) => onSaveSyllabus({ ...syllabus, lead: v })}
              />
            }
          />
          <div className="py-3">
            {currentUnit >= syllabus.classUnit + syllabus.lead ? (
              <span className="text-sm" style={{ color: C.gold }}>
                Sprint on track (+{currentUnit - syllabus.classUnit}) — you are
                {" "}
                {currentUnit - syllabus.classUnit} unit
                {currentUnit - syllabus.classUnit === 1 ? "" : "s"} ahead of your class.
              </span>
            ) : (
              <button
                onClick={() => onChangeUnit(Math.min(MAX_UNIT, syllabus.classUnit + syllabus.lead))}
                className="px-3 py-2 rounded-lg text-sm"
                style={{ border: `1px solid ${C.wrong}`, color: C.wrong }}
              >
                Behind — jump to unit {Math.min(MAX_UNIT, syllabus.classUnit + syllabus.lead)}
              </button>
            )}
          </div>
        </>
      ) : (
        <div className="py-4">
          <button
            onClick={() => onSaveSyllabus({ classUnit: 1, lead: 2 })}
            className="px-3 py-2 rounded-lg text-sm"
            style={{ border: `1px solid ${C.line}`, color: C.faint }}
          >
            Set up the syllabus sprint
          </button>
        </div>
      )}

      {currentUnit > MAX_SHIPPED_UNIT && (
        <div className="text-xs pb-3" style={{ color: C.faint }}>
          Content is authored through Unit {MAX_SHIPPED_UNIT} so far — later units show
          everything unlocked to date.
        </div>
      )}

      {/* Gold decaying is the single most surprising thing the app does, and
          until now it was never explained anywhere. This is where you look. */}
      <div
        className="text-xs mt-4 pt-3 pb-1"
        style={{ color: C.faint, borderTop: `1px solid ${C.line}`, lineHeight: 1.55 }}
      >
        <span style={{ color: C.gold }}>How gold works.</span> A cell gilds at three
        correct answers — two if you answer inside {(FAST_MS / 1000).toFixed(1)}s
        (<span className="gk">ταχύς</span>). Gold then <b style={{ color: C.marble }}>decays</b>:
        untouched for {DECAY_SOFT_DAYS} days it dulls a level, and for {DECAY_HARD_DAYS} days
        another. Decay is applied once when the app opens, so a break really does re-open the
        tables you have been neglecting.
      </div>
    </div>
  );
}

function Stat({ label, value, of, tone }) {
  return (
    <div>
      <div className="text-xs" style={{ color: C.faint, letterSpacing: "0.12em" }}>
        {label}
      </div>
      <div className="text-xl mt-0.5" style={{ color: tone ?? C.marble }}>
        {value}
        {of != null && <span className="text-sm" style={{ color: C.faint }}> / {of}</span>}
      </div>
    </div>
  );
}

function Row({ k, d, control }) {
  return (
    <div
      className="flex items-center justify-between gap-4 py-3"
      style={{ borderBottom: `1px solid ${C.line}` }}
    >
      <div>
        <div className="text-sm" style={{ color: C.marble }}>
          {k}
        </div>
        <div className="text-xs mt-1" style={{ color: C.faint, maxWidth: "15rem" }}>
          {d}
        </div>
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );
}
