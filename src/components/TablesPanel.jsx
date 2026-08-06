import { useMemo, useState } from "react";
import { C, GOLD_AT } from "../theme.js";
import { unitTitle, paradigmsIntroducedAt, MAX_SHIPPED_UNIT } from "../content/index.js";
import { tableWeakness } from "../scheduler.js";

/* ---------- the tables panel ----------
   Container-agnostic on purpose: it renders no position, no scroll box and no
   chrome of its own, because on a phone it lives inside a Sheet and at ≥1024px
   it lives in a permanent left rail. The container owns the box; this owns the
   content. Changing that contract breaks the desktop rail. */

const FILTERS = [
  ["unit", "By unit"],
  ["weakest", "Weakest first"],
  ["unfinished", "Unfinished"],
];

export default function TablesPanel({
  paradigms,
  activeIds,
  getM,
  onPick,
  currentUnit,
  masteryMap,
}) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("unit");

  const goldOf = (p) => p.cells.filter((c) => getM(p.id, c.id) >= GOLD_AT).length;
  const needle = q.trim().toLowerCase();

  /* Search covers the short name, the full label and the unit's own topic, so
     "subjunctive" finds a table whose short name never says so. No Greek-form
     search: it would need a polytonic keyboard to be usable. */
  const matches = useMemo(() => {
    if (!needle) return paradigms;
    return paradigms.filter((p) =>
      [p.short, p.label, unitTitle(p.unitIntroduced)]
        .filter(Boolean)
        .some((s) => s.toLowerCase().includes(needle))
    );
  }, [paradigms, needle]);

  const flat = useMemo(() => {
    let list = matches;
    if (filter === "unfinished") list = list.filter((p) => goldOf(p) < p.cells.length);
    return [...list].sort(
      (a, b) =>
        tableWeakness(b, currentUnit, masteryMap) - tableWeakness(a, currentUnit, masteryMap)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matches, filter, currentUnit, masteryMap]);

  const grouped = useMemo(() => {
    const groups = [];
    for (const p of matches) {
      const last = groups[groups.length - 1];
      if (last && last.unit === p.unitIntroduced) last.items.push(p);
      else groups.push({ unit: p.unitIntroduced, items: [p] });
    }
    return groups;
  }, [matches]);

  /* The next unit, shown locked. Today locked units simply do not render, so
     the gate is invisible; showing it turns a restriction into visible runway. */
  const nextUnit = currentUnit + 1;
  const locked =
    nextUnit <= MAX_SHIPPED_UNIT && filter === "unit" && !needle
      ? paradigmsIntroducedAt(nextUnit)
      : [];

  const tile = (p) => {
    const gold = goldOf(p);
    const on = activeIds.has(p.id);
    const done = gold === p.cells.length;
    return (
      <button
        key={p.id}
        onClick={() => onPick(p.id)}
        className="px-3 py-2 rounded-lg text-sm"
        style={{
          background: on ? C.panelUp : "transparent",
          border: `1px solid ${on ? C.aegean : C.line}`,
          color: on ? C.marble : C.faint,
        }}
      >
        <span className="gk">{p.short}</span>
        <span className="ml-2 text-xs" style={{ color: done ? C.gold : C.faint }}>
          {gold}/{p.cells.length}
        </span>
      </button>
    );
  };

  return (
    <div>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search tables…"
        className="w-full rounded-lg px-3 py-2 text-sm outline-none"
        style={{ background: C.ink, border: `1px solid ${C.line}`, color: C.marble }}
      />

      <div className="flex gap-2 mt-2.5 mb-1 flex-wrap">
        {FILTERS.map(([k, lbl]) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className="px-3 py-1 rounded-full text-xs"
            style={{
              background: filter === k ? C.aegeanDeep : "transparent",
              border: `1px solid ${filter === k ? C.aegean : C.line}`,
              color: filter === k ? "#fff" : C.faint,
            }}
          >
            {lbl}
          </button>
        ))}
      </div>

      {matches.length === 0 && (
        <div className="py-6 text-sm" style={{ color: C.faint }}>
          No table matches “{q}”.
        </div>
      )}

      {filter === "unit"
        ? grouped.map((g) => (
            <div key={g.unit} className="pt-3">
              <div className="mb-1.5 flex items-baseline gap-2 flex-wrap">
                <span
                  className="text-xs shrink-0"
                  style={{ color: C.aegean, letterSpacing: "0.14em" }}
                >
                  UNIT {g.unit}
                </span>
                <span className="text-xs" style={{ color: C.faint }}>
                  {unitTitle(g.unit)}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">{g.items.map(tile)}</div>
            </div>
          ))
        : flat.length > 0 && <div className="flex flex-wrap gap-2 pt-3">{flat.map(tile)}</div>}

      {filter === "unfinished" && flat.length === 0 && matches.length > 0 && (
        <div className="py-6 text-sm" style={{ color: C.gold }}>
          Every unlocked table is fully gilded.
        </div>
      )}

      {locked.length > 0 && (
        <div className="pt-5">
          <div className="mb-1.5 flex items-baseline gap-2 flex-wrap">
            <span className="text-xs shrink-0" style={{ color: C.faint, letterSpacing: "0.14em" }}>
              UNIT {nextUnit}
            </span>
            <span className="text-xs" style={{ color: C.faint }}>
              · locked
            </span>
          </div>
          <div className="flex flex-wrap gap-2" style={{ opacity: 0.45 }}>
            {locked.map((p) => (
              <span
                key={p.id}
                className="px-3 py-2 rounded-lg text-sm"
                style={{ border: `1px dashed ${C.line}`, color: C.faint }}
              >
                🔒 <span className="gk">{p.short}</span>
              </span>
            ))}
          </div>
          <div className="text-xs mt-2" style={{ color: C.faint }}>
            Move to Unit {nextUnit} in <b style={{ color: C.marble }}>Progress &amp; syllabus</b>{" "}
            when your class does.
          </div>
        </div>
      )}
    </div>
  );
}
