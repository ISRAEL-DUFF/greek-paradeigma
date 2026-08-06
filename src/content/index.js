import unit01 from "./unit01.json";
import unit02 from "./unit02.json";
import unit03 from "./unit03.json";
import unit04 from "./unit04.json";
import unit05 from "./unit05.json";
import unit06 from "./unit06.json";
import unit07 from "./unit07.json";
import unit08 from "./unit08.json";
import unit09 from "./unit09.json";
import unit10 from "./unit10.json";
import unit11 from "./unit11.json";
import unit12 from "./unit12.json";
import unit13 from "./unit13.json";
import unit14 from "./unit14.json";
import unit15 from "./unit15.json";
import unit16 from "./unit16.json";
import unit17 from "./unit17.json";
import unit18 from "./unit18.json";
import unit19 from "./unit19.json";
import unit20 from "./unit20.json";

/* All shipped units. Add each new unit file here as the pipeline delivers it. */
const UNITS = [
  unit01, unit02, unit03, unit04, unit05, unit06, unit07, unit08, unit09, unit10,
  unit11, unit12, unit13, unit14, unit15, unit16, unit17, unit18, unit19, unit20,
];

/** Every paradigm across all shipped units, in unit order. */
export const ALL_PARADIGMS = UNITS.flatMap((u) => u.paradigms);

/** Paradigms visible at the given currentUnit setting. Unit gating is sacred:
 *  nothing beyond currentUnit is ever returned from here. */
export function unlockedParadigms(currentUnit) {
  return ALL_PARADIGMS.filter((p) => p.unitIntroduced <= currentUnit);
}

/** Cells unlocked at currentUnit, each tagged with its paradigm. */
export function unlockedCells(currentUnit) {
  return unlockedParadigms(currentUnit).flatMap((p) =>
    p.cells
      .filter((c) => c.unitMax <= currentUnit)
      .map((c) => ({ paradigm: p, cell: c }))
  );
}

/** Paradigms newly introduced at exactly this unit (for the unlock screen). */
export function paradigmsIntroducedAt(unit) {
  return ALL_PARADIGMS.filter((p) => p.unitIntroduced === unit);
}

export const SHIPPED_UNITS = UNITS.map((u) => u.unit);
export const MAX_SHIPPED_UNIT = Math.max(...SHIPPED_UNITS);

export const cellKey = (paradigmId, cellId) => `${paradigmId}:${cellId}`;
