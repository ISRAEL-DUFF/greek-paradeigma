import { describe, it, expect } from "vitest";
import { gradeAssemblyTap, gradeLevel1Tap, askLevelFor, assemblyPlan } from "./grading.js";
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
