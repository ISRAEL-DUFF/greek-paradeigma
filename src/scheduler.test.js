import { describe, it, expect } from "vitest";
import {
  buildTray,
  buildAssemblyTray,
  pickImpostor,
  pickLookup,
  pickSnipe,
  pickScrambleTable,
  answerOf,
  endingOf,
  drillsWholeForm,
  tableWeakness,
} from "./scheduler.js";
import { GOLD_AT } from "./theme.js";
import { unlockedParadigms, unlockedCells, ALL_PARADIGMS, cellKey } from "./content/index.js";
import { MAX_UNIT } from "./theme.js";

const UNITS = Array.from({ length: MAX_UNIT }, (_, i) => i + 1);
const gated = (p, unit) => p.cells.filter((c) => c.unitMax <= unit);

describe("unit gating — the plan's single clearest advantage (§3.4, §7)", () => {
  /* These sweep every gated cell in all 20 units, so they collect violations
     and assert once — asserting inside the hot loop is what makes them slow. */
  it("no chip in any Level-1 tray requires a unit above the player's", () => {
    const bad = [];
    let trays = 0;
    for (const unit of UNITS) {
      // every ending the player is allowed to have met by now
      const legal = new Set();
      for (const p of unlockedParadigms(unit))
        for (const c of gated(p, unit)) legal.add(drillsWholeForm(p) ? c.form : endingOf(c));

      for (const p of unlockedParadigms(unit))
        for (const c of gated(p, unit))
          for (let i = 0; i < 2; i++) {
            const tray = buildTray({ paradigm: p, cell: c, currentUnit: unit, masteryRecord: null });
            trays++;
            for (const chip of tray)
              if (!legal.has(chip)) bad.push(`unit ${unit} ${p.id}:${c.id} → "${chip}"`);
          }
    }
    expect(bad).toEqual([]);
    expect(trays).toBeGreaterThan(1000);
  }, 20000);

  it("no piece in any assembly tray requires a unit above the player's", () => {
    const bad = [];
    for (const unit of UNITS) {
      const legal = new Set();
      for (const p of unlockedParadigms(unit))
        if (!drillsWholeForm(p))
          for (const c of gated(p, unit))
            for (const pc of c.pieces) if (pc.text !== "") legal.add(pc.role + ":" + pc.text);

      for (const p of unlockedParadigms(unit)) {
        if (drillsWholeForm(p)) continue;
        for (const c of gated(p, unit)) {
          const { chips } = buildAssemblyTray({ paradigm: p, cell: c, currentUnit: unit });
          for (const chip of chips)
            if (!legal.has(chip.role + ":" + chip.text))
              bad.push(`unit ${unit} ${p.id}:${c.id} → "${chip.text}" (${chip.role})`);
        }
      }
    }
    expect(bad).toEqual([]);
  }, 20000);

  it("the impostor never shows a form from beyond the unit gate", () => {
    for (const unit of UNITS) {
      for (const p of unlockedParadigms(unit)) {
        const imp = pickImpostor(p, unit);
        if (!imp) continue;
        const cell = p.cells.find((c) => c.id === imp.cid);
        expect(cell, `${p.id}: impostor targeted a missing cell`).toBeTruthy();
        expect(cell.unitMax).toBeLessThanOrEqual(unit);
      }
    }
  });
});

describe("every ask is answerable", () => {
  it("the correct answer is always present in the Level-1 tray", () => {
    const bad = [];
    for (const unit of UNITS)
      for (const p of unlockedParadigms(unit))
        for (const c of gated(p, unit)) {
          const tray = buildTray({ paradigm: p, cell: c, currentUnit: unit, masteryRecord: null });
          if (!tray.includes(answerOf(p, c))) bad.push(`unit ${unit} ${p.id}:${c.id}`);
        }
    expect(bad).toEqual([]);
  }, 20000);

  it("every assembly tray contains each expected piece, in gradeable form", () => {
    const bad = [];
    for (const unit of UNITS)
      for (const p of unlockedParadigms(unit)) {
        if (drillsWholeForm(p)) continue;
        for (const c of gated(p, unit)) {
          const { expected, chips } = buildAssemblyTray({ paradigm: p, cell: c, currentUnit: unit });
          for (const pc of expected)
            if (!chips.some((ch) => ch.text === pc.text && ch.role === pc.role && !ch.refusal))
              bad.push(`unit ${unit} ${p.id}:${c.id} lacks ${pc.role}:${pc.text}`);
        }
      }
    expect(bad).toEqual([]);
  }, 20000);

  it("no tray offers a duplicate chip (which would be ungradeable)", () => {
    const bad = [];
    for (const unit of UNITS)
      for (const p of unlockedParadigms(unit))
        for (const c of gated(p, unit)) {
          const tray = buildTray({ paradigm: p, cell: c, currentUnit: unit, masteryRecord: null });
          if (new Set(tray).size !== tray.length) bad.push(`unit ${unit} ${p.id}:${c.id}`);
        }
    expect(bad).toEqual([]);
  }, 20000);
});

describe("distractors are real neighbours (§ principle 2)", () => {
  it("a recorded confusion is guaranteed back in the tray", () => {
    const unit = 2;
    const p = unlockedParadigms(unit).find((x) => x.id === "verb.luo.impf.act.ind");
    const cell = p.cells.find((c) => c.id === "2s"); // answer ες
    const rec = { confusions: { ετε: 4, ον: 1 } };
    for (let i = 0; i < 20; i++) {
      const tray = buildTray({ paradigm: p, cell, currentUnit: unit, masteryRecord: rec });
      expect(tray).toContain("ετε");
    }
  });

  it("principal-parts and whole-form tables never mix chips with ending tables", () => {
    const unit = MAX_UNIT;
    for (const p of unlockedParadigms(unit)) {
      const whole = drillsWholeForm(p);
      for (const c of gated(p, unit)) {
        const tray = buildTray({ paradigm: p, cell: c, currentUnit: unit, masteryRecord: null });
        for (const chip of tray) {
          // whole-form trays hold whole words; ending trays hold endings
          const looksWhole = ALL_PARADIGMS.some((q) =>
            q.cells.some((qc) => qc.form === chip)
          );
          if (whole) expect(looksWhole).toBe(true);
        }
      }
    }
  });
});

describe("impostor honesty", () => {
  const shownForm = (p, imp) => {
    const cell = p.cells.find((c) => c.id === imp.cid);
    return imp.wholeForm
      ? imp.fakeEnd
      : cell.pieces.filter((x) => x.role !== "ending").map((x) => x.text).join("") + imp.fakeEnd;
  };

  it("an ending-swap impostor never accidentally spells a genuine form", () => {
    // A made-up ending on a real stem could land on a word that is correct
    // elsewhere; then the 'wrong' cell would in fact be right.
    // Collect-then-assert: per-iteration expect() made this sweep time out
    // the moment the corpus grew past ~1600 cells (the flaky-gating lesson).
    const bad = [];
    for (const unit of UNITS) {
      const real = new Set(unlockedCells(unit).map(({ cell }) => cell.form));
      for (const p of unlockedParadigms(unit)) {
        if (drillsWholeForm(p)) continue;
        for (let i = 0; i < 5; i++) {
          const imp = pickImpostor(p, unit);
          if (!imp) continue;
          const shown = shownForm(p, imp);
          if (real.has(shown)) bad.push(`unit ${unit}: ${p.id} spelled genuine ${shown}`);
        }
      }
    }
    expect(bad).toEqual([]);
  }, 30000);

  it("a whole-form impostor borrows a sibling's word but never one of its own", () => {
    // The mechanic is 'ἔλυσα where ἔλαβον belongs': the word is real, but wrong
    // for THIS chart. It must not be a form of this chart, or two cells would
    // look equally right and the round would be unanswerable.
    const bad = [];
    for (const unit of UNITS)
      for (const p of unlockedParadigms(unit)) {
        if (!drillsWholeForm(p)) continue;
        const own = new Set(p.cells.map((c) => c.form));
        for (let i = 0; i < 5; i++) {
          const imp = pickImpostor(p, unit);
          if (!imp) continue;
          if (own.has(shownForm(p, imp))) bad.push(`unit ${unit}: ${p.id} reused its own form`);
        }
      }
    expect(bad).toEqual([]);
  }, 30000);

  it("the falsified cell never still displays its own correct form", () => {
    const bad = [];
    for (const unit of UNITS)
      for (const p of unlockedParadigms(unit))
        for (let i = 0; i < 5; i++) {
          const imp = pickImpostor(p, unit);
          if (!imp) continue;
          const cell = p.cells.find((c) => c.id === imp.cid);
          if (shownForm(p, imp) === cell.form) bad.push(`${p.id}:${imp.cid} impostor is a no-op`);
        }
    expect(bad).toEqual([]);
  }, 30000);
});

describe("reverse lookup ambiguity (M3)", () => {
  it("an ambiguous form requires every cell that holds it", () => {
    const unit = 2;
    const p = unlockedParadigms(unit).find((x) => x.id === "verb.luo.impf.act.ind");
    // ἔλυον is both 1st singular and 3rd plural
    let sawAmbiguous = false;
    for (let i = 0; i < 60; i++) {
      const l = pickLookup(p, unit, {});
      const holders = p.cells.filter((c) => c.form === l.form).map((c) => c.id);
      expect(new Set(l.required)).toEqual(new Set(holders));
      if (l.form === "ἔλυον") {
        sawAmbiguous = true;
        expect(l.required.sort()).toEqual(["1s", "3p"]);
      }
    }
    expect(sawAmbiguous, "never drew the ambiguous form in 60 tries").toBe(true);
  });
});

describe("scramble scheduling", () => {
  const gild = (unit, predicate) => {
    const map = {};
    for (const { paradigm, cell } of unlockedCells(unit))
      if (predicate(paradigm))
        map[cellKey(paradigm.id, cell.id)] = { level: 3, lastSeenAt: 5000 };
    return map;
  };

  it("never hands back the table just finished", () => {
    for (const unit of [2, 6, 13, 20]) {
      const just = unlockedParadigms(unit)[0];
      for (let i = 0; i < 40; i++) {
        const p = pickScrambleTable(unit, {}, just.id);
        expect(p).toBeTruthy();
        expect(p.id).not.toBe(just.id);
      }
    }
  });

  it("only ever returns a table inside the unit gate", () => {
    for (const unit of UNITS)
      for (let i = 0; i < 20; i++) {
        const p = pickScrambleTable(unit, {}, null);
        expect(p).toBeTruthy();
        expect(p.unitIntroduced).toBeLessThanOrEqual(unit);
      }
  });

  it("prefers a table that is weak overall to one that is nearly gold", () => {
    const unit = 2;
    const [weakTable, strongTable] = unlockedParadigms(unit);
    // gild everything EXCEPT weakTable, so it is the only weak one left
    const map = gild(unit, (p) => p.id !== weakTable.id);
    for (let i = 0; i < 30; i++) {
      const p = pickScrambleTable(unit, map, null);
      expect(p.id).toBe(weakTable.id);
    }
    expect(strongTable).toBeTruthy();
  });

  it("falls back to the least-recently-practised table once all are gold", () => {
    const unit = 1;
    const map = gild(unit, () => true);
    const ps = unlockedParadigms(unit);
    const stale = ps[2];
    // make one table clearly the oldest
    for (const c of stale.cells) map[cellKey(stale.id, c.id)] = { level: 3, lastSeenAt: 1 };
    for (let i = 0; i < 20; i++) {
      expect(pickScrambleTable(unit, map, null).id).toBe(stale.id);
    }
  });

  it("still returns something when only one table is unlocked", () => {
    // excluding the only candidate must not strand the session
    const unit = 1;
    const only = unlockedParadigms(unit)[0];
    const p = pickScrambleTable(unit, {}, only.id);
    expect(p).toBeTruthy();
  });

  it("interleaves earlier units rather than drilling only the newest", () => {
    const unit = 6;
    let earlier = 0;
    const N = 400;
    for (let i = 0; i < N; i++) {
      const p = pickScrambleTable(unit, {}, null);
      if (p.unitIntroduced < unit) earlier++;
    }
    expect(earlier / N).toBeGreaterThan(0.15);
    expect(earlier / N).toBeLessThan(0.45);
  });
});

describe("snipe scheduling", () => {
  it("only ever returns a cell inside the unit gate", () => {
    for (const unit of UNITS)
      for (let i = 0; i < 30; i++) {
        const t = pickSnipe(unit, {});
        expect(t).toBeTruthy();
        expect(t.paradigm.unitIntroduced).toBeLessThanOrEqual(unit);
        expect(t.cell.unitMax).toBeLessThanOrEqual(unit);
      }
  });

  it("prefers the current unit roughly 70% of the time when both exist (§3.3)", () => {
    const unit = 6;
    let current = 0;
    const N = 600;
    for (let i = 0; i < N; i++) {
      const t = pickSnipe(unit, {});
      if (t.paradigm.unitIntroduced === unit) current++;
    }
    expect(current / N).toBeGreaterThan(0.55);
    expect(current / N).toBeLessThan(0.85);
  });

  it("defends gold: with everything gilded it returns the longest-unseen cell", () => {
    const unit = 1;
    const map = {};
    let oldest = null;
    unlockedCells(unit).forEach(({ paradigm, cell }, i) => {
      const key = cellKey(paradigm.id, cell.id);
      map[key] = { level: 3, lastSeenAt: 1000 + i };
      if (oldest === null) oldest = key;
    });
    const t = pickSnipe(unit, map);
    expect(cellKey(t.paradigm.id, t.cell.id)).toBe(oldest);
  });
});

/* tableWeakness is shared by the Scramble scheduler and the Tables panel's
   "weakest first" ordering, so both must mean the same thing by "weak". */
describe("tableWeakness", () => {
  const unit = 3;
  const p = unlockedParadigms(unit).find((x) => x.cells.length >= 6);

  const mapAtLevel = (lvl) =>
    Object.fromEntries(p.cells.map((c) => [cellKey(p.id, c.id), { level: lvl }]));

  it("is zero when every gated cell is gilded", () => {
    expect(tableWeakness(p, unit, mapAtLevel(GOLD_AT))).toBe(0);
  });

  it("is greatest when nothing has been learned", () => {
    const untouched = tableWeakness(p, unit, {});
    expect(untouched).toBeGreaterThan(0);
    expect(untouched).toBeGreaterThan(tableWeakness(p, unit, mapAtLevel(1)));
  });

  it("falls monotonically as mastery rises", () => {
    let prev = Infinity;
    for (let lvl = 0; lvl <= GOLD_AT; lvl++) {
      const w = tableWeakness(p, unit, mapAtLevel(lvl));
      expect(w).toBeLessThan(prev);
      prev = w;
    }
  });

  it("treats a missing record as level 0", () => {
    expect(tableWeakness(p, unit, {})).toBe(tableWeakness(p, unit, mapAtLevel(0)));
  });

  it("weights common forms above rare ones", () => {
    // tier 1 cells contribute more than tier 3 cells at the same level
    const tier1 = p.cells.filter((c) => c.freqTier === 1);
    const tier3 = p.cells.filter((c) => c.freqTier === 3);
    if (tier1.length === 0 || tier3.length === 0) return; // not all tables mix tiers
    const only = (cells) =>
      Object.fromEntries(
        p.cells.map((c) => [
          cellKey(p.id, c.id),
          { level: cells.includes(c) ? 0 : GOLD_AT },
        ])
      );
    expect(tableWeakness(p, unit, only(tier1.slice(0, 1)))).toBeGreaterThan(
      tableWeakness(p, unit, only(tier3.slice(0, 1)))
    );
  });

  it("never counts cells gated above the current unit", () => {
    const future = p.cells.filter((c) => c.unitMax > 1);
    if (future.length === 0) return;
    expect(tableWeakness(p, 1, {})).toBeLessThan(tableWeakness(p, unit, {}));
  });
});
