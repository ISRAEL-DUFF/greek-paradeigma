/* Answer grading and round composition — kept pure and free of React so they
   can be tested directly. This is the code path that decides whether a tap
   costs the player a mastery level, and which cells a round asks about, so it
   is the part of the app that most needs to be verifiable. */
import { GOLD_AT } from "./theme.js";

/** How each morpheme role is named when we teach ordering. */
export const ROLE_LABEL = {
  augment: "the augment",
  redup: "the reduplication",
  stem: "the stem",
  tenseMarker: "the tense marker",
  moodMarker: "the mood marker",
  themeVowel: "the theme vowel",
  ending: "the ending",
};

/** Short role names, for showing the build order in the prompt. */
export const ROLE_SHORT = {
  augment: "augment",
  redup: "redup",
  stem: "stem",
  tenseMarker: "tense",
  moodMarker: "mood",
  themeVowel: "theme",
  ending: "ending",
};

/** The ordered role plan of an assembly, e.g. "augment → stem → ending". */
export const assemblyPlan = (expected) =>
  expected.map((pc) => ROLE_SHORT[pc.role] ?? pc.role).join(" → ");

/**
 * Grade one tap during a Level-2 morpheme assembly.
 *
 * Verdicts:
 *   "complete"   — final piece placed, the form is built
 *   "advance"    — right piece, more to go
 *   "refuse"     — a piece this form cannot take (augment on a present, etc.);
 *                  curriculum, never penalized
 *   "outOfOrder" — a genuine piece of THIS form, tapped too early; teach the
 *                  order, never penalized. Tapping the ending first is the most
 *                  natural mistake a player can make and must not be scored as
 *                  "you don't know this form".
 *   "wrong"      — a piece that does not belong to this form at all. This is
 *                  the only verdict that costs a mastery level.
 */
export function gradeAssemblyTap({ expected, progress, chip }) {
  if (chip.refusal) return { verdict: "refuse", message: chip.refusal };

  const want = expected[progress];
  if (!want) return { verdict: "wrong" };

  if (chip.text === want.text && chip.role === want.role) {
    return {
      verdict: progress + 1 >= expected.length ? "complete" : "advance",
    };
  }

  const belongs = expected.some(
    (pc) => pc.text === chip.text && pc.role === chip.role
  );
  if (belongs) {
    const label = ROLE_LABEL[want.role] ?? "the next piece";
    return {
      verdict: "outOfOrder",
      message:
        progress === 0
          ? `Not yet — start with ${label}.`
          : `Not yet — ${label} comes next.`,
    };
  }

  return { verdict: "wrong" };
}

/**
 * Which cells a Fill / Twin round should blank.
 *
 * Normally only the cells below gold blank, and gilded ones stay on screen as
 * scaffolding. But a table whose cells are ALL gold would otherwise produce an
 * empty round — the board would sit at "complete" and "Run it again" would do
 * nothing, leaving a mastered table permanently undrillable. So when there is
 * nothing weak left the round becomes a DEFENCE round: everything blanks, and
 * gold has to be earned again. Gold must be defended.
 */
export function roundBlanks({ cells, levelOf, goldAt = GOLD_AT }) {
  const weak = cells.filter((c) => levelOf(c) < goldAt);
  return weak.length > 0
    ? { cells: weak, isDefence: false }
    : { cells, isDefence: cells.length > 0 };
}

/* ================= Scramble (rebuild the table) ================= */

/**
 * Build the tile set for a Scramble round: one tile per cell, shuffled, with
 * the table left empty. A table containing a homograph therefore puts two
 * identical tiles in the bank — which is honest, and tells the player that an
 * ambiguity is coming.
 */
export function scrambleTiles(cells, shuffle) {
  return shuffle(cells.map((c, i) => ({ id: `t${i}`, form: c.form })));
}

/**
 * Move a tile between the bank and the table.
 * `from` / `to` are {type:"bank"} or {type:"cell", cellId}. Dropping onto an
 * occupied cell displaces its occupant back to the bank rather than destroying
 * it, so a mis-drop can never lose a form.
 */
export function moveTile({ placed, bank, tile, from, to }) {
  const nextPlaced = { ...placed };
  let nextBank = bank.filter((t) => t.id !== tile.id);

  if (from.type === "cell") delete nextPlaced[from.cellId];

  if (to.type === "cell") {
    const occupant = nextPlaced[to.cellId];
    if (occupant && occupant.id !== tile.id) nextBank = [...nextBank, occupant];
    nextPlaced[to.cellId] = tile;
  } else {
    nextBank = [...nextBank, tile];
  }
  return { placed: nextPlaced, bank: nextBank };
}

/**
 * Judge a Scramble arrangement.
 *
 * Correctness is decided by comparing the FORM sitting in each cell against
 * that cell's own form — never by tracking which tile went where. That is what
 * makes homographs work: with ἔλυον in both 1st singular and 3rd plural, either
 * tile satisfies either cell, exactly as the language does.
 */
export function gradeScramble({ cells, placed }) {
  const correctCells = [];
  const wrongCells = [];
  let remaining = 0;

  for (const c of cells) {
    const tile = placed[c.id];
    if (!tile) remaining++;
    else if (tile.form === c.form) correctCells.push(c.id);
    else wrongCells.push(c.id);
  }
  return {
    complete: remaining === 0,
    remaining,
    correctCells,
    wrongCells,
    allCorrect: remaining === 0 && wrongCells.length === 0,
  };
}

/** Grade one tap in a Level-1 (single-chip) ask. */
export function gradeLevel1Tap({ answer, chip }) {
  return { verdict: chip.text === answer ? "complete" : "wrong" };
}

/**
 * Which drill level a cell should be asked at.
 * Level 2 (assembly) needs mastery >= 2 and a form with more than one piece;
 * the race is always Level 1 so the clock measures recall, not dexterity.
 */
export function askLevelFor({ level, pieceCount, mode }) {
  return level >= 2 && pieceCount > 1 && mode !== "race" ? 2 : 1;
}
