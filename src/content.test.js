import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { MODES, MODE_IDS, SAME_TABLE_MODES, ROUND_MODES, siblingModes } from "./content/modes.js";
import {
  ALL_PARADIGMS,
  unlockedParadigms,
  unlockedCells,
  paradigmsIntroducedAt,
  unitTitle,
  cellKey,
} from "./content/index.js";
import { decayedLevel, DECAY_TO_2_MS, DECAY_TO_1_MS } from "./db.js";
import { MAX_UNIT, GOLD_AT } from "./theme.js";

/* The offline validator (npm run validate) owns the Greek-level invariants.
   These guard the runtime contract the app itself depends on. */

describe("content contract", () => {
  it("every cell's pieces resolve to its form (after stored sandhi)", () => {
    const bad = [];
    for (const p of ALL_PARADIGMS)
      for (const c of p.cells) {
        let s = c.pieces.map((pc) => pc.text).join("");
        for (const r of c.sandhi ?? []) s = s.replace(r.seq, r.to);
        if (s.normalize("NFC") !== c.form.normalize("NFC")) bad.push(`${p.id}:${c.id}`);
      }
    expect(bad).toEqual([]);
  });

  it("every cell has exactly one ending piece", () => {
    for (const p of ALL_PARADIGMS)
      for (const c of p.cells)
        expect(c.pieces.filter((pc) => pc.role === "ending").length, `${p.id}:${c.id}`).toBe(1);
  });

  it("homograph links are symmetric and share a form", () => {
    const byKey = new Map();
    for (const p of ALL_PARADIGMS)
      for (const c of p.cells) byKey.set(cellKey(p.id, c.id), c);
    for (const [key, c] of byKey)
      for (const ref of c.homographs ?? []) {
        const other = byKey.get(ref);
        expect(other, `${key} -> missing ${ref}`).toBeTruthy();
        expect(other.form).toBe(c.form);
        expect(other.homographs ?? []).toContain(key);
      }
  });

  it("identical forms anywhere in the corpus are homograph-linked", () => {
    const byForm = new Map();
    for (const p of ALL_PARADIGMS)
      for (const c of p.cells) {
        if (!byForm.has(c.form)) byForm.set(c.form, []);
        byForm.get(c.form).push(cellKey(p.id, c.id));
      }
    const unlinked = [];
    for (const [form, keys] of byForm) {
      if (keys.length < 2) continue;
      const byKey = new Map();
      for (const p of ALL_PARADIGMS)
        for (const c of p.cells) byKey.set(cellKey(p.id, c.id), c);
      for (const k of keys)
        for (const other of keys)
          if (k !== other && !(byKey.get(k).homographs ?? []).includes(other))
            unlinked.push(`${form}: ${k} !-> ${other}`);
    }
    expect(unlinked).toEqual([]);
  });

  it("no cell is unlocked before its paradigm", () => {
    for (const p of ALL_PARADIGMS)
      for (const c of p.cells) expect(c.unitMax).toBeGreaterThanOrEqual(p.unitIntroduced);
  });

  it("unit gating is monotonic — content only ever accumulates", () => {
    let prev = 0;
    for (let u = 1; u <= MAX_UNIT; u++) {
      const n = unlockedCells(u).length;
      expect(n).toBeGreaterThanOrEqual(prev);
      prev = n;
    }
  });

  it("every unit has a plain-English topic for players not following the book", () => {
    for (let u = 1; u <= MAX_UNIT; u++) {
      const t = unitTitle(u);
      expect(t, `unit ${u} has no title`).toBeTruthy();
      expect(t.length, `unit ${u} title too terse`).toBeGreaterThan(8);
      // it should describe, not just restate the table names
      expect(t).not.toMatch(/^UNIT/i);
    }
  });

  it("every paradigm is reachable from its own unit's unlock screen", () => {
    const announced = new Set();
    for (let u = 1; u <= MAX_UNIT; u++)
      for (const p of paradigmsIntroducedAt(u)) announced.add(p.id);
    for (const p of ALL_PARADIGMS) expect(announced.has(p.id), p.id).toBe(true);
  });

  it("grid positions are complete and unique in every table", () => {
    for (const p of ALL_PARADIGMS) {
      const rows = p.layout.rowLabels.length;
      const cols = p.layout.colLabels.length;
      expect(p.cells.length, p.id).toBe(rows * cols);
      const seen = new Set(p.cells.map((c) => `${c.r},${c.c}`));
      expect(seen.size, p.id).toBe(rows * cols);
    }
  });
});

describe("time decay (§3.3)", () => {
  const now = 10_000_000_000;
  it("holds gold inside four days", () => {
    expect(decayedLevel(GOLD_AT, now - DECAY_TO_2_MS + 1000, now)).toBe(3);
  });
  it("dulls gold to 2 after four days", () => {
    expect(decayedLevel(GOLD_AT, now - DECAY_TO_2_MS - 1000, now)).toBe(2);
  });
  it("drops to 1 after ten days", () => {
    expect(decayedLevel(GOLD_AT, now - DECAY_TO_1_MS - 1000, now)).toBe(1);
  });
  it("never decays a cell that was not gold", () => {
    expect(decayedLevel(2, now - DECAY_TO_1_MS * 5, now)).toBe(2);
    expect(decayedLevel(0, now - DECAY_TO_1_MS * 5, now)).toBe(0);
  });
});

/* ---------- play modes ---------- */
describe("mode descriptions are content, and cover every mode", () => {
  it("exposes all seven modes with unique ids", () => {
    expect(MODE_IDS.length).toBe(7);
    expect(new Set(MODE_IDS).size).toBe(7);
  });

  it("gives every mode a name, a description and a note", () => {
    for (const m of MODES) {
      expect(m.name?.trim(), `${m.id} name`).toBeTruthy();
      expect(m.description?.trim(), `${m.id} description`).toBeTruthy();
      expect(m.note?.trim(), `${m.id} note`).toBeTruthy();
    }
  });

  /* The real invariant: a mode the app can ENTER must be one the app can
     EXPLAIN. Reading the source is deliberate — it is the only way to catch a
     mode being added to the game loop without a description, which is exactly
     how TWIN and IMPOSTOR ended up as opaque labels in the first place. */
  it("describes every mode the game loop can actually be in", () => {
    const src = readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
    const used = new Set();
    for (const re of [
      /mode === "([a-z]+)"/g,
      /changeMode\("([a-z]+)"\)/g,
      /startRound\("([a-z]+)"\)/g,
      /setMode\("([a-z]+)"\)/g,
    ]) {
      for (const m of src.matchAll(re)) used.add(m[1]);
    }
    expect(used.size).toBeGreaterThan(0);
    const undescribed = [...used].filter((id) => !MODE_IDS.includes(id));
    expect(undescribed, "modes the app can enter but cannot explain").toEqual([]);
  });

  it("has no described mode the app cannot actually enter", () => {
    const src = readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
    const orphan = MODE_IDS.filter((id) => !src.includes(`"${id}"`));
    expect(orphan, "described modes with no code path").toEqual([]);
  });

  it("keeps descriptions short enough to read at a glance", () => {
    for (const m of MODES) {
      expect(m.description.length, `${m.id} description`).toBeLessThanOrEqual(90);
      expect(m.note.length, `${m.id} note`).toBeLessThanOrEqual(130);
    }
  });
});

describe("which modes are offered where", () => {
  it("offers only modes that drill the table in front of you", () => {
    // snipe is cross-table by definition; twin needs a pair, not a table
    expect(SAME_TABLE_MODES).not.toContain("snipe");
    expect(SAME_TABLE_MODES).not.toContain("twin");
    for (const id of SAME_TABLE_MODES) expect(MODE_IDS).toContain(id);
  });

  it("never suggests the mode you are already in", () => {
    for (const id of MODE_IDS) {
      expect(siblingModes(id).map((m) => m.id)).not.toContain(id);
    }
  });

  it("returns fully described modes, so a suggestion can always be explained", () => {
    for (const m of siblingModes("fill")) {
      expect(m.name).toBeTruthy();
      expect(m.description).toBeTruthy();
    }
  });

  it("gives a round-end screen only to modes that actually end", () => {
    // lookup, impostor and snipe are continuous streams — they auto-advance
    for (const id of ROUND_MODES) expect(MODE_IDS).toContain(id);
    for (const id of ["snipe", "lookup", "impostor"]) expect(ROUND_MODES).not.toContain(id);
  });
});
