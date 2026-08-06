import { C } from "../theme.js";
import { cellKey } from "../content/index.js";
import Cell from "./Cell.jsx";

/* ---------- one full paradigm table ---------- */
export default function ParadigmTable({
  paradigm,
  currentUnit,
  phase,
  mode,
  sticky,
  blanks,
  feedback,
  active,
  impostor,
  lookup,
  scramble,
  dragHandlers,
  assemblyPrefix,
  getM,
  onCellTap,
  children,
}) {
  return (
    <div
      className="w-full rounded-2xl p-5 rise"
      style={{ background: C.panel, border: `1px solid ${C.line}` }}
    >
      <div
        className={`gk text-lg mb-4 ${sticky ? "sticky top-0 z-10 py-1 -my-1" : ""}`}
        style={{ color: C.marble, ...(sticky ? { background: C.panel } : {}) }}
      >
        {paradigm.label}
      </div>

      <div
        className="grid gap-2"
        style={{
          gridTemplateColumns: `72px repeat(${paradigm.layout.colLabels.length}, 1fr)`,
        }}
      >
        <div />
        {paradigm.layout.colLabels.map((cl) => (
          <div
            key={cl}
            className="text-center text-xs pb-1"
            style={{ color: C.faint, letterSpacing: "0.1em" }}
          >
            {cl.toUpperCase()}
          </div>
        ))}

        {paradigm.layout.rowLabels.map((rl, r) => (
          <Row
            key={rl}
            rl={rl}
            r={r}
            paradigm={paradigm}
            phase={phase}
            mode={mode}
            blanks={blanks}
            feedback={feedback}
            active={active}
            impostor={impostor}
            lookup={lookup}
            scramble={scramble}
            dragHandlers={dragHandlers}
            assemblyPrefix={assemblyPrefix}
            getM={getM}
            onCellTap={onCellTap}
          />
        ))}
      </div>
      {children}
    </div>
  );
}

function Row({ rl, r, paradigm, phase, mode, blanks, feedback, active, impostor, lookup, scramble, dragHandlers, assemblyPrefix, getM, onCellTap }) {
  return (
    <>
      <div className="flex items-center text-xs" style={{ color: C.faint, letterSpacing: "0.08em" }}>
        {rl.toUpperCase()}
      </div>
      {paradigm.layout.colLabels.map((_, cIdx) => {
        const cell = paradigm.cells.find((c) => c.r === r && c.c === cIdx);
        if (!cell) return <div key={cIdx} />;
        const key = cellKey(paradigm.id, cell.id);
        const isActive = active?.pid === paradigm.id && active?.cid === cell.id;
        return (
          <Cell
            key={cell.id}
            cell={cell}
            paradigm={paradigm}
            phase={phase}
            mode={mode}
            blank={blanks.has(key)}
            fb={feedback[key]}
            active={isActive}
            impostor={impostor}
            lookup={lookup}
            scramble={scramble}
            dragHandlers={dragHandlers}
            assemblyPrefix={isActive ? assemblyPrefix : null}
            m={getM(paradigm.id, cell.id)}
            onTap={() => onCellTap(paradigm.id, cell.id)}
          />
        );
      })}
    </>
  );
}
