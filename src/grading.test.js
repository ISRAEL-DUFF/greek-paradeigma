import { describe, it, expect } from "vitest";
import {
  gradeAssemblyTap,
  gradeLevel1Tap,
  askLevelFor,
  assemblyPlan,
  roundBlanks,
  scrambleTiles,
  moveTile,
  gradeScramble,
} from "./grading.js";
import unit02 from "./content/unit02.json";

/* The λύω imperfect — the table where this bug was found. */
const impf = unit02.paradigms.find((p) => p.id === "verb.luo.impf.act.ind");
const cell2s = impf.cells.find((c) => c.id === "2s"); // ἔλυες = ἔ + λυ + ες
const pieces = (cell) => cell.pieces.filter((pc) => pc.text !== "");

describe("assembly grading", () => {
  it("REGRESSION: tapping the correct ending first is taught, never penalized", () => {
    // A player drilled to mastery 2 has been tapping endings for two rounds.
    // The tray silently becomes an assembly tray; their trained move is to tap
    // the ending. That MUST NOT be scored as a wrong answer — it cost a mastery
    // level per tap and made the round impossible to finish.
    const expected = pieces(cell2s);
    const endingChip = { id: "e2", text: "ες", role: "ending" };

    const r = gradeAssemblyTap({ expected, progress: 0, chip: endingChip });

    expect(r.verdict).toBe("outOfOrder");
    expect(r.verdict).not.toBe("wrong");
    expect(r.message).toMatch(/augment/); // tells them what actually comes first
  });

  it("accepts the pieces in order and completes on the last one", () => {
    const expected = pieces(cell2s); // ἔ, λυ, ες
    expect(
      gradeAssemblyTap({ expected, progress: 0, chip: { text: "ἔ", role: "augment" } }).verdict
    ).toBe("advance");
    expect(
      gradeAssemblyTap({ expected, progress: 1, chip: { text: "λυ", role: "stem" } }).verdict
    ).toBe("advance");
    expect(
      gradeAssemblyTap({ expected, progress: 2, chip: { text: "ες", role: "ending" } }).verdict
    ).toBe("complete");
  });

  it("still penalizes a piece that belongs to no part of the form", () => {
    const expected = pieces(cell2s);
    // -αμεν is the aorist's ending; it is a real distractor, not a mis-order.
    const r = gradeAssemblyTap({ expected, progress: 0, chip: { text: "αμεν", role: "ending" } });
    expect(r.verdict).toBe("wrong");
  });

  it("bounces refusal chips with their curriculum message, no penalty", () => {
    const expected = pieces(cell2s);
    const r = gradeAssemblyTap({
      expected,
      progress: 0,
      chip: { text: "λε", role: "redup", refusal: "reduplication: perfect system only" },
    });
    expect(r.verdict).toBe("refuse");
    expect(r.message).toMatch(/perfect/);
  });

  it("distinguishes same text under a different role", () => {
    // ἔ as an augment belongs; ἔ offered as a stem does not.
    const expected = pieces(cell2s);
    expect(
      gradeAssemblyTap({ expected, progress: 1, chip: { text: "ἔ", role: "augment" } }).verdict
    ).toBe("outOfOrder");
    expect(
      gradeAssemblyTap({ expected, progress: 1, chip: { text: "ἔ", role: "stem" } }).verdict
    ).toBe("wrong");
  });

  it("names the build order for the prompt", () => {
    expect(assemblyPlan(pieces(cell2s))).toBe("augment → stem → ending");
  });
});

describe("level-1 grading", () => {
  it("accepts the ending and rejects anything else", () => {
    expect(gradeLevel1Tap({ answer: "ες", chip: { text: "ες" } }).verdict).toBe("complete");
    expect(gradeLevel1Tap({ answer: "ες", chip: { text: "ετε" } }).verdict).toBe("wrong");
  });

  it("handles the empty ending (ἵστη, λύοι) as a real answer", () => {
    expect(gradeLevel1Tap({ answer: "", chip: { text: "" } }).verdict).toBe("complete");
    expect(gradeLevel1Tap({ answer: "", chip: { text: "ν" } }).verdict).toBe("wrong");
  });
});

describe("round composition", () => {
  const cells = ["1s", "1p", "2s", "2p", "3s", "3p"];

  it("blanks only the cells below gold while any remain weak", () => {
    const levels = { "1s": 3, "1p": 1, "2s": 3, "2p": 0, "3s": 3, "3p": 3 };
    const r = roundBlanks({ cells, levelOf: (c) => levels[c] });
    expect(r.cells).toEqual(["1p", "2p"]);
    expect(r.isDefence).toBe(false);
  });

  it("REGRESSION: a fully gilded table still yields a drillable round", () => {
    // Previously blanks came back empty, so the round snapped straight to
    // "complete" and 'Run it again' did nothing — a mastered table could never
    // be practised again.
    const levels = Object.fromEntries(cells.map((c) => [c, 3]));
    const r = roundBlanks({ cells, levelOf: (c) => levels[c] });
    expect(r.cells).toEqual(cells); // every cell blanks
    expect(r.cells.length).toBeGreaterThan(0);
    expect(r.isDefence).toBe(true);
  });

  it("an empty table is not reported as a defence round", () => {
    expect(roundBlanks({ cells: [], levelOf: () => 0 })).toEqual({
      cells: [],
      isDefence: false,
    });
  });

  it("one slip out of gold returns the round to ordinary drilling", () => {
    const levels = Object.fromEntries(cells.map((c) => [c, 3]));
    levels["2s"] = 2;
    const r = roundBlanks({ cells, levelOf: (c) => levels[c] });
    expect(r.cells).toEqual(["2s"]);
    expect(r.isDefence).toBe(false);
  });
});

describe("scramble", () => {
  const cells = impf.cells; // λύω imperfect: ἔλυον appears in BOTH 1s and 3p
  const tiles = (cs) => scrambleTiles(cs, (a) => a); // identity "shuffle" for determinism
  const place = (pairs) =>
    Object.fromEntries(pairs.map(([cid, form]) => [cid, { id: "x" + cid, form }]));

  it("banks one tile per cell, table starts empty", () => {
    const t = tiles(cells);
    expect(t).toHaveLength(cells.length);
    expect(t.map((x) => x.form).sort()).toEqual(cells.map((c) => c.form).sort());
  });

  it("puts two identical tiles in the bank when the table has a homograph", () => {
    const forms = tiles(cells).map((t) => t.form);
    expect(forms.filter((f) => f === "ἔλυον")).toHaveLength(2);
  });

  it("REGRESSION: homographs are graded by form, not by which tile went where", () => {
    // ἔλυον is 1st singular AND 3rd plural. Either tile satisfies either cell —
    // grading by tile identity would mark a perfectly correct table wrong.
    const t = tiles(cells);
    const elyon = t.filter((x) => x.form === "ἔλυον");
    const placed = {};
    for (const c of cells) placed[c.id] = t.find((x) => x.form === c.form);
    // deliberately swap the two identical tiles
    placed["1s"] = elyon[1];
    placed["3p"] = elyon[0];
    const r = gradeScramble({ cells, placed });
    expect(r.allCorrect).toBe(true);
    expect(r.wrongCells).toEqual([]);
  });

  it("reports which cells are wrong and how many are left", () => {
    const placed = place([
      ["1s", "ἔλυον"],
      ["1p", "ἔλυες"], // wrong
      ["2s", "ἐλύομεν"], // wrong
    ]);
    const r = gradeScramble({ cells, placed });
    expect(r.complete).toBe(false);
    expect(r.remaining).toBe(3);
    expect(r.correctCells).toEqual(["1s"]);
    expect(r.wrongCells.sort()).toEqual(["1p", "2s"]);
    expect(r.allCorrect).toBe(false);
  });

  it("is only complete when every slot is filled", () => {
    const full = place(cells.map((c) => [c.id, c.form]));
    const r = gradeScramble({ cells, placed: full });
    expect(r.complete).toBe(true);
    expect(r.allCorrect).toBe(true);
    expect(r.remaining).toBe(0);
  });

  it("moves a tile from the bank onto a cell", () => {
    const bank = tiles(cells);
    const t = bank[0];
    const r = moveTile({ placed: {}, bank, tile: t, from: { type: "bank" }, to: { type: "cell", cellId: "2s" } });
    expect(r.placed["2s"]).toBe(t);
    expect(r.bank).not.toContain(t);
    expect(r.bank).toHaveLength(cells.length - 1);
  });

  it("sends a placed tile back to the bank (undo)", () => {
    const bank = tiles(cells);
    const t = bank[0];
    const a = moveTile({ placed: {}, bank, tile: t, from: { type: "bank" }, to: { type: "cell", cellId: "2s" } });
    const b = moveTile({ ...a, tile: t, from: { type: "cell", cellId: "2s" }, to: { type: "bank" } });
    expect(b.placed["2s"]).toBeUndefined();
    expect(b.bank).toContain(t);
    expect(b.bank).toHaveLength(cells.length);
  });

  it("displaces the occupant back to the bank rather than losing it", () => {
    const bank = tiles(cells);
    const [a, b] = bank;
    let s = moveTile({ placed: {}, bank, tile: a, from: { type: "bank" }, to: { type: "cell", cellId: "1s" } });
    s = moveTile({ ...s, tile: b, from: { type: "bank" }, to: { type: "cell", cellId: "1s" } });
    expect(s.placed["1s"]).toBe(b);
    expect(s.bank).toContain(a); // the displaced tile survived
    // no form is ever lost: bank + placed always accounts for every tile
    expect(s.bank.length + Object.keys(s.placed).length).toBe(cells.length);
  });

  it("never loses or duplicates a tile across a long shuffle of moves", () => {
    const all = tiles(cells);
    let s = { placed: {}, bank: all };
    const ids = ["1s", "1p", "2s", "2p", "3s", "3p"];
    for (let i = 0; i < 40; i++) {
      const fromBank = s.bank.length > 0 && i % 3 !== 2;
      const tile = fromBank
        ? s.bank[i % s.bank.length]
        : Object.values(s.placed)[i % Math.max(1, Object.keys(s.placed).length)];
      if (!tile) continue;
      const from = fromBank
        ? { type: "bank" }
        : { type: "cell", cellId: Object.keys(s.placed).find((k) => s.placed[k].id === tile.id) };
      const to = i % 4 === 3 ? { type: "bank" } : { type: "cell", cellId: ids[i % ids.length] };
      s = moveTile({ ...s, tile, from, to });
      const seen = [...s.bank, ...Object.values(s.placed)].map((t) => t.id);
      expect(new Set(seen).size).toBe(cells.length);
    }
  });
});

describe("ask level", () => {
  it("only assembles at mastery 2+ on multi-piece forms", () => {
    expect(askLevelFor({ level: 1, pieceCount: 3, mode: "fill" })).toBe(1);
    expect(askLevelFor({ level: 2, pieceCount: 3, mode: "fill" })).toBe(2);
    expect(askLevelFor({ level: 3, pieceCount: 1, mode: "fill" })).toBe(1);
  });

  it("REGRESSION: a cell demoted to 1 by a miss must drop back to Level 1 at once", () => {
    // The re-ask used to read a stale mastery map and serve assembly again,
    // taking a second level for the same misunderstanding.
    expect(askLevelFor({ level: 1, pieceCount: 3, mode: "fill" })).toBe(1);
  });

  it("never assembles under the race clock", () => {
    expect(askLevelFor({ level: 3, pieceCount: 4, mode: "race" })).toBe(1);
  });
});
