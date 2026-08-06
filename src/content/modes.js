import data from "./modes.json";

/* The seven play modes, as content rather than code.
 *
 * They live here for the same reason refusals.json does: the words a learner
 * reads are curriculum, and curriculum should be editable without touching a
 * component. "IMPOSTOR" on a chip taught nothing; a sentence does.
 *
 * The validator requires a name, a description and a note for every mode, and
 * a test asserts that every mode the app can actually enter has an entry here —
 * so a new mode cannot ship undescribed.
 */
export const MODES = data.modes;
export const MODE_IDS = MODES.map((m) => m.id);

const byId = new Map(MODES.map((m) => [m.id, m]));

export const modeOf = (id) => byId.get(id) ?? null;
export const modeName = (id) => byId.get(id)?.name ?? id;

/* Modes that drill THE TABLE IN FRONT OF YOU, and so can be offered at the end
   of a round as "or try this table as…". Deliberately excludes:
     snipe — cross-table by definition; it would take you somewhere else
     twin  — needs a confusable pair, not a single table
   Keeping this next to the mode content rather than in the component is what
   lets a test assert it, and stops the list drifting when a mode is added. */
export const SAME_TABLE_MODES = ["fill", "impostor", "lookup", "race", "scramble"];

/* Modes that END, and therefore have a round-end screen. The rest are
   continuous streams: snipe re-aims, lookup and impostor auto-advance. */
export const ROUND_MODES = ["fill", "twin", "race", "scramble"];

export function siblingModes(currentMode) {
  return SAME_TABLE_MODES.filter((id) => id !== currentMode).map((id) => byId.get(id));
}
