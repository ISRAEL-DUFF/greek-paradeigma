import { useEffect, useState } from "react";
import { C, GOLD_AT } from "../theme.js";
import { drillsWholeForm, scaffoldOf } from "../scheduler.js";

/* M6: a correct sandhi cell first shows its underlying seam, then the pieces
   visibly collapse into the contracted surface form. */
function CorrectFlash({ cell, whole, prefix, suffix }) {
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    if (!cell.sandhi) return;
    const t = setTimeout(() => setCollapsed(true), 850);
    return () => clearTimeout(t);
  }, [cell]);
  if (cell.sandhi && collapsed) {
    return (
      <span className="gk text-xl">
        <span className="collapse-in">{cell.form}</span>
      </span>
    );
  }
  return (
    <span className="gk text-xl">
      <span className="split-l">{prefix}</span>
      <span className="split-r">{whole ? cell.form : suffix}</span>
    </span>
  );
}

export default function Cell({ cell, paradigm, currentUnit, phase, mode, blank, fb, active, impostor, lookup, scramble, dragHandlers, assemblyPrefix, m, onTap }) {
  /* A cell above the gate is never shown and never a target — the sacred rule
     ("no form is ever shown or drilled beyond your unit") applied to DISPLAY.
     Until Phase 1 every table was uniformly gated, so this branch never fired;
     the infinitive grid spans U2..U16 and made it real. It must precede the
     scramble branch, or a locked cell would render as a droppable slot that
     grading ignores — an unsolvable board. */
  if (currentUnit != null && cell.unitMax > currentUnit) {
    return (
      <div
        className="rounded-xl px-2 py-3 text-center flex items-center justify-center"
        style={{ minHeight: "58px", border: `1px dashed ${C.line}`, opacity: 0.45 }}
        title={`unlocks at Unit ${cell.unitMax}`}
        aria-label={`locked until unit ${cell.unitMax}`}
      >
        <span className="text-xs" style={{ color: C.faint }}>
          🔒 {cell.unitMax}
        </span>
      </div>
    );
  }

  /* Scramble owns the cell entirely: it is a drop target holding either a
     placed tile (itself draggable, so a placement can be undone) or an empty
     slot. Verdict colours come from the last Check. */
  if (scramble) {
    const tile = scramble.placed[cell.id];
    const verdict = scramble.result
      ? scramble.result.wrongCells.includes(cell.id)
        ? "wrong"
        : scramble.result.correctCells.includes(cell.id)
          ? "right"
          : null
      : null;
    const border =
      verdict === "wrong" ? C.wrong : verdict === "right" ? C.goldDeep : tile ? C.aegeanDeep : C.line;
    return (
      <div
        data-drop={`cell:${cell.id}`}
        className={`rounded-xl px-2 py-3 text-center flex items-center justify-center ${
          !tile ? "slot-open" : ""
        }`}
        style={{
          minHeight: "58px",
          border: `1px ${tile ? "solid" : "dashed"} ${border}`,
          background: tile ? "rgba(255,255,255,0.03)" : "rgba(111,179,216,0.04)",
        }}
      >
        {tile ? (
          <span
            className="gk text-xl draggable"
            onPointerCancel={dragHandlers.cancelDrag}
            onPointerDown={(e) => dragHandlers.beginDrag(e, tile, { type: "cell", cellId: cell.id })}
            onPointerMove={dragHandlers.moveDrag}
            onPointerUp={dragHandlers.endDrag}
            style={{
              color: verdict === "wrong" ? C.wrong : verdict === "right" ? C.gold : C.marble,
            }}
          >
            {tile.form}
          </span>
        ) : (
          <span style={{ color: C.line }}>·</span>
        )}
      </div>
    );
  }

  const gold = m >= GOLD_AT;
  const whole = drillsWholeForm(paradigm);
  const isImpostorCell = impostor && impostor.cid === cell.id && fb !== "correct";
  const prefix = scaffoldOf(paradigm, cell);
  const suffix = whole ? cell.form : cell.pieces.find((p) => p.role === "ending").text;

  let content;
  if (mode === "lookup" && lookup) {
    if (fb === "correct") {
      content = (
        <span className="gk text-xl" style={{ color: C.aegean }}>
          {cell.form}
        </span>
      );
    } else if (gold) {
      content = <span className="gk text-xl gilded">{cell.form}</span>;
    } else {
      content = (
        <span className="gk text-xl" style={{ color: C.line }}>
          ·
        </span>
      );
    }
  } else if (fb === "correct") {
    content = <CorrectFlash cell={cell} whole={whole} prefix={prefix} suffix={suffix} />;
  } else if (fb === "reveal") {
    content = (
      <span className="gk text-xl" style={{ color: C.aegean }}>
        {cell.form}
      </span>
    );
  } else if (assemblyPrefix !== null && active) {
    content = (
      <span className="gk text-xl">
        <span style={{ color: C.aegean }}>{assemblyPrefix}</span>
        <span style={{ color: C.aegean }}>—</span>
      </span>
    );
  } else if (
    mode === "impostor" ||
    !blank ||
    phase === "study" ||
    phase === "decaying"
  ) {
    const shown = isImpostorCell
      ? impostor.wholeForm
        ? impostor.fakeEnd
        : prefixOfForFake(cell) + impostor.fakeEnd
      : cell.form;
    content = (
      <span
        className={`gk text-xl ${gold && mode !== "impostor" ? "gilded" : ""} ${
          phase === "decaying" && !gold ? "decaying" : ""
        }`}
      >
        {shown}
      </span>
    );
  } else {
    content = (
      <span className="gk text-xl" style={{ color: C.faint }}>
        {prefix}
        <span style={{ color: active ? C.aegean : C.line }}>—</span>
      </span>
    );
  }

  return (
    <button
      id={`cell-${paradigm.id}-${cell.id}`}
      onClick={onTap}
      className={`rounded-xl px-3 py-3 text-center ${fb === "wrong" ? "shake" : ""}`}
      style={{
        background: active ? "rgba(111,179,216,0.10)" : "rgba(255,255,255,0.02)",
        border: `1px solid ${
          fb === "wrong" ? C.wrong : active ? C.aegean : gold ? C.goldDeep : C.line
        }`,
        cursor:
          mode === "impostor" || mode === "lookup" || (blank && fb !== "correct")
            ? "pointer"
            : "default",
        minHeight: "58px",
      }}
    >
      {content}
    </button>
  );
}

/* Impostor fakes are composed on the underlying prefix (pre-sandhi). */
function prefixOfForFake(cell) {
  return cell.pieces
    .filter((p) => p.role !== "ending")
    .map((p) => p.text)
    .join("");
}
