import { unlockedParadigms, unlockedCells, cellKey } from "./content/index.js";
import { GOLD_AT } from "./theme.js";
import refusalRules from "./content/refusals.json";

export const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/** Principal-parts tables drill whole forms, not endings. */
export const isPP = (p) => p.drillClass === "principalParts";
/** Tables whose unit of drilling is the whole word: principal parts, and
 *  suppletive irregulars (εἰμί, οἶδα…) where there is no seam to cut. */
export const drillsWholeForm = (p) =>
  p.drillClass === "principalParts" || p.drillClass === "wholeForm";
/** Pooling key: chips never cross drill classes (a PP tray must not offer ἦσθα,
 *  and an ending tray must not offer whole forms). */
const drillClassOf = (p) => p.drillClass ?? "table";

/** The ending piece of a cell (exactly one, enforced by the validator). */
export const endingOf = (cell) => cell.pieces.find((p) => p.role === "ending").text;
/** Everything before the ending — what a blank cell shows as scaffold. */
export const prefixOf = (cell) =>
  cell.pieces.filter((p) => p.role !== "ending").map((p) => p.text).join("");

/** What the player must produce for a Level-1 ask on this cell. */
export const answerOf = (paradigm, cell) =>
  drillsWholeForm(paradigm) ? cell.form : endingOf(cell);
/** The scaffold shown while the cell is blank. */
export const scaffoldOf = (paradigm, cell) =>
  drillsWholeForm(paradigm) ? "" : prefixOf(cell);

const TRAY_SIZE = 6;

const gatedCells = (p, currentUnit) => p.cells.filter((c) => c.unitMax <= currentUnit);

/**
 * Build the Level-1 chip tray: 1 correct answer + 5 distractors.
 * Distractors are real neighbors within the unit gate — endings from this
 * paradigm first, then same-kind paradigms. Principal-parts trays hold whole
 * forms and never mix with ending pools (their "endings" would leak ungated
 * morphology into early units, and vice versa). The player's top confusion, if
 * real and gated, is guaranteed a slot.
 */
export function buildTray({ paradigm, cell, currentUnit, masteryRecord }) {
  const whole = drillsWholeForm(paradigm);
  const correct = answerOf(paradigm, cell);
  const chipOf = (p) => (c) => (whole ? c.form : endingOf(c));

  const siblings = unlockedParadigms(currentUnit).filter(
    (p) =>
      p.kind === paradigm.kind &&
      p.id !== paradigm.id &&
      drillClassOf(p) === drillClassOf(paradigm)
  );

  const near = new Set(gatedCells(paradigm, currentUnit).map(chipOf(paradigm)));
  const far = new Set(
    siblings.flatMap((p) => gatedCells(p, currentUnit).map(chipOf(p)))
  );
  near.delete(correct);
  for (const e of near) far.delete(e);
  far.delete(correct);

  const distractors = [];
  const confusions = masteryRecord?.confusions ?? {};
  const top = Object.entries(confusions).sort((a, b) => b[1] - a[1])[0]?.[0];
  if (top && top !== correct && (near.has(top) || far.has(top))) {
    distractors.push(top);
    near.delete(top);
    far.delete(top);
  }

  for (const pool of [shuffle([...near]), shuffle([...far])]) {
    for (const e of pool) {
      if (distractors.length >= TRAY_SIZE - 1) break;
      distractors.push(e);
    }
  }

  return shuffle([correct, ...distractors]);
}

/* ================= M2 — Level-2 morpheme assembly ================= */

/**
 * Build the assembly tray for a cell at mastery >= 2: every piece of the form
 * (in scrambled order) plus role-appropriate distractors and refusal pieces.
 * A refusal piece carries a role the form cannot take (augment on an
 * unaugmented form, reduplication outside the perfect); tapping it bounces
 * with a teaching string from refusals.json — that refusal is curriculum.
 *
 * Returns { expected: [piece…], chips: [{id, text, role, refusal?}…] }.
 */
export function buildAssemblyTray({ paradigm, cell, currentUnit }) {
  const expected = cell.pieces.filter((pc) => pc.text !== "");
  const chips = expected.map((pc, i) => ({
    id: `e${i}`,
    text: pc.text,
    role: pc.role,
  }));

  const presentRoles = new Set(expected.map((pc) => pc.role));
  const kindCells = unlockedParadigms(currentUnit)
    .filter((p) => p.kind === paradigm.kind && !drillsWholeForm(p))
    .flatMap((p) => gatedCells(p, currentUnit));

  // pool of unlocked pieces by role, excluding this cell's own texts
  const byRole = {};
  for (const c of kindCells)
    for (const pc of c.pieces) {
      if (pc.text === "") continue;
      (byRole[pc.role] ??= new Set()).add(pc.text);
    }
  for (const pc of expected) byRole[pc.role]?.delete(pc.text);

  let n = 0;
  const add = (text, role, refusal) =>
    chips.push({ id: `d${n++}`, text, role, ...(refusal ? { refusal } : {}) });

  // two wrong endings — the classic confusion
  for (const t of shuffle([...(byRole.ending ?? [])]).slice(0, 2)) add(t, "ending");
  // a wrong tense marker when the form has one (σ vs κ vs θη)
  if (presentRoles.has("tenseMarker"))
    for (const t of shuffle([...(byRole.tenseMarker ?? [])]).slice(0, 1))
      add(t, "tenseMarker");
  // refusal pieces: roles this form cannot take, but which exist in gated content
  for (const role of ["augment", "redup", "moodMarker"]) {
    if (presentRoles.has(role)) continue;
    const pool = [...(byRole[role] ?? [])];
    if (pool.length && refusalRules[role])
      add(pool[Math.floor(Math.random() * pool.length)], role, refusalRules[role]);
  }

  return { expected, chips: shuffle(chips) };
}

/* ================= M3 — reverse lookup ================= */

/**
 * Pick a reverse-lookup round for a table: a surface form the player must
 * locate. When the form is ambiguous, every valid cell must be found — that
 * ambiguity training is what reading actually requires. Homographs outside
 * this table are ignored here (lookup is played against one table).
 */
export function pickLookup(paradigm, currentUnit, masteryMap) {
  const cells = gatedCells(paradigm, currentUnit);
  const level = (c) => masteryMap[cellKey(paradigm.id, c.id)]?.level ?? 0;
  const weights = cells.map((c) => GOLD_AT + 1 - level(c));
  let roll = Math.random() * weights.reduce((a, b) => a + b, 0);
  let target = cells[cells.length - 1];
  for (let i = 0; i < cells.length; i++) {
    roll -= weights[i];
    if (roll <= 0) {
      target = cells[i];
      break;
    }
  }
  const required = cells
    .filter((c) => c.form === target.form)
    .map((c) => c.id);
  return { form: target.form, required };
}

/* ================= M4 — twin tables ================= */

/**
 * Pick the pair of same-kind tables the player most needs to see side by side.
 * Score = recorded confusions that cross into the sibling's endings (the tray
 * chip you keep choosing wrongly belongs to the twin), plus a small shared-
 * weakness term so fresh tables still pair sensibly. This is what "the scheduler
 * selects twins that maximize contrast on the player's current weaknesses" means
 * operationally.
 */
export function pickTwins(currentUnit, masteryMap) {
  const ps = unlockedParadigms(currentUnit).filter((p) => !drillsWholeForm(p));
  if (ps.length < 2) return null;

  const endingSets = new Map(
    ps.map((p) => [p.id, new Set(gatedCells(p, currentUnit).map(endingOf))])
  );
  const crossConfusion = (a, b) => {
    let n = 0;
    for (const c of gatedCells(a, currentUnit)) {
      const rec = masteryMap[cellKey(a.id, c.id)];
      if (!rec?.confusions) continue;
      for (const [chip, count] of Object.entries(rec.confusions))
        if (endingSets.get(b.id).has(chip)) n += count;
    }
    return n;
  };
  const weakCount = (p) =>
    gatedCells(p, currentUnit).filter(
      (c) => (masteryMap[cellKey(p.id, c.id)]?.level ?? 0) < GOLD_AT
    ).length;

  let best = null;
  let bestScore = -1;
  for (let i = 0; i < ps.length; i++)
    for (let j = i + 1; j < ps.length; j++) {
      const a = ps[i];
      const b = ps[j];
      if (a.kind !== b.kind) continue;
      const related = a.lemma === b.lemma || a.layout.rowLabels[0] === b.layout.rowLabels[0];
      if (!related) continue;
      const score =
        10 * (crossConfusion(a, b) + crossConfusion(b, a)) +
        Math.min(weakCount(a), weakCount(b)) +
        Math.random(); // tiebreak
      if (score > bestScore) {
        bestScore = score;
        best = [a, b];
      }
    }
  return best;
}

/* ================= scheduling ================= */

const TIER_WEIGHT = { 1: 1, 2: 0.5, 3: 0.15 };
/* §3.3: ~70% of asks come from the current unit, ~30% interleave from earlier
   units. Interleaving is non-negotiable — it feels worse and works better. */
const CURRENT_UNIT_SHARE = 0.7;

/**
 * Pick the next Snipe target across ALL unlocked paradigms: 70/30 split between
 * the current unit and interleaved review of earlier units, weakest-first within
 * each, scaled by frequency tier. Falls back to the longest-unseen cell if
 * everything is gold (gold must be defended).
 */
export function pickSnipe(currentUnit, masteryMap) {
  const pool = unlockedCells(currentUnit);
  const level = ({ paradigm, cell }) =>
    masteryMap[cellKey(paradigm.id, cell.id)]?.level ?? 0;

  const weak = pool.filter((x) => level(x) < GOLD_AT);
  if (weak.length === 0) {
    return pool.reduce((oldest, x) => {
      const seen = (y) => masteryMap[cellKey(y.paradigm.id, y.cell.id)]?.lastSeenAt ?? 0;
      return seen(x) < seen(oldest) ? x : oldest;
    }, pool[0]);
  }

  const current = weak.filter((x) => x.paradigm.unitIntroduced === currentUnit);
  const earlier = weak.filter((x) => x.paradigm.unitIntroduced < currentUnit);
  let bucket;
  if (current.length && earlier.length)
    bucket = Math.random() < CURRENT_UNIT_SHARE ? current : earlier;
  else bucket = current.length ? current : earlier;

  const weights = bucket.map(
    (x) => (GOLD_AT - level(x)) * (TIER_WEIGHT[x.cell.freqTier] ?? 1)
  );
  let roll = Math.random() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < bucket.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return bucket[i];
  }
  return bucket[bucket.length - 1];
}

/**
 * Pick the next table for a Scramble session.
 *
 * Scramble rebuilds a WHOLE table, so unlike Snipe — which hunts your single
 * weakest cell — this scores each table by how far the table as a whole still
 * is from gold, weighted by frequency tier. On top of that it keeps Snipe's
 * rules: ~70 % from the current unit, ~30 % interleaved from earlier ones, and
 * weakest-first within the bucket. `excludeId` is the table you just finished,
 * so a session never hands the same one straight back.
 *
 * When every unlocked table is fully gilded there is nothing "weak" to choose,
 * so it serves the least-recently-practised table — the same defend-the-oldest
 * behaviour Snipe falls back on.
 */
/**
 * How far a whole table still is from gold, weighted by frequency tier.
 * 0 means every gated cell is gilded. Shared by the Scramble scheduler and the
 * Tables panel's "weakest first" ordering, so both mean the same thing by
 * "weak" — two different definitions would be quietly misleading.
 */
export function tableWeakness(paradigm, currentUnit, masteryMap) {
  return gatedCells(paradigm, currentUnit).reduce((sum, c) => {
    const lvl = masteryMap[cellKey(paradigm.id, c.id)]?.level ?? 0;
    return sum + (GOLD_AT - lvl) * (TIER_WEIGHT[c.freqTier] ?? 1);
  }, 0);
}

export function pickScrambleTable(currentUnit, masteryMap, excludeId) {
  const all = unlockedParadigms(currentUnit).filter(
    (p) => gatedCells(p, currentUnit).length > 0
  );
  const pool = all.filter((p) => p.id !== excludeId);
  if (pool.length === 0) return all[0] ?? null;

  const scored = pool.map((p) => ({ p, w: tableWeakness(p, currentUnit, masteryMap) }));
  const weak = scored.filter((x) => x.w > 0);

  if (weak.length === 0) {
    const lastSeenOf = (p) =>
      gatedCells(p, currentUnit).reduce(
        (min, c) => Math.min(min, masteryMap[cellKey(p.id, c.id)]?.lastSeenAt ?? 0),
        Infinity
      );
    return pool.reduce((oldest, p) => (lastSeenOf(p) < lastSeenOf(oldest) ? p : oldest), pool[0]);
  }

  const current = weak.filter((x) => x.p.unitIntroduced === currentUnit);
  const earlier = weak.filter((x) => x.p.unitIntroduced < currentUnit);
  let bucket;
  if (current.length && earlier.length)
    bucket = Math.random() < CURRENT_UNIT_SHARE ? current : earlier;
  else bucket = current.length ? current : earlier;

  let roll = Math.random() * bucket.reduce((a, x) => a + x.w, 0);
  for (const x of bucket) {
    roll -= x.w;
    if (roll <= 0) return x.p;
  }
  return bucket[bucket.length - 1].p;
}

/* Does this string carry a grave, acute, or circumflex? (NFD-decomposed check) */
const hasAccent = (s) => /[̀́͂]/.test(s.normalize("NFD"));

/**
 * Pick an impostor for a table: one cell rendered with a wrong ending (for
 * principal parts: a mutated sibling form). The fake respects the unit gate,
 * never mixes principal-parts chips with ending chips, must not accidentally
 * be a genuine form, and must not double-accent (visibly fake).
 */
export function pickImpostor(paradigm, currentUnit) {
  const candidates = shuffle(gatedCells(paradigm, currentUnit));

  // Whole-form tables (principal parts, suppletive irregulars): the impostor is
  // a sibling form sitting in the wrong cell — ἔλυσα where ἔλαβον belongs. It
  // must not be a genuine form of THIS table (cross-table homographs are fine;
  // that is precisely the confusion worth training).
  if (drillsWholeForm(paradigm)) {
    const ownForms = new Set(paradigm.cells.map((c) => c.form));
    const pool = shuffle([
      ...new Set(
        unlockedParadigms(currentUnit)
          .filter(
            (p) => p.kind === paradigm.kind && drillsWholeForm(p)
          )
          .flatMap((p) => gatedCells(p, currentUnit).map((c) => c.form))
      ),
    ]);
    for (const cell of candidates)
      for (const fake of pool) {
        if (ownForms.has(fake)) continue;
        return { cid: cell.id, fakeEnd: fake, wholeForm: true };
      }
    return null;
  }

  const validForms = new Set(unlockedCells(currentUnit).map(({ cell }) => cell.form));
  for (const cell of candidates) {
    const correct = endingOf(cell);
    const prefix = prefixOf(cell);
    const pool = shuffle([
      ...new Set([
        ...gatedCells(paradigm, currentUnit).map(endingOf),
        ...unlockedParadigms(currentUnit)
          .filter(
            (p) => p.kind === paradigm.kind && p.id !== paradigm.id && !drillsWholeForm(p)
          )
          .flatMap((p) => gatedCells(p, currentUnit).map(endingOf)),
      ]),
    ]);
    for (const fake of pool) {
      if (fake === correct) continue;
      if (fake === "") continue;
      if (validForms.has(prefix + fake)) continue; // would be a genuine form elsewhere
      if (hasAccent(prefix) && hasAccent(fake)) continue; // double accent: visibly fake
      return { cid: cell.id, fakeEnd: fake };
    }
  }
  return null;
}
