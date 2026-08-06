/* Answer grading — kept pure and free of React so it can be tested directly.
   This is the code path that decides whether a tap costs the player a mastery
   level, so it is the part of the app that most needs to be verifiable. */

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
