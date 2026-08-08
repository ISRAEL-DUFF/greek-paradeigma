#!/usr/bin/env node
/**
 * Content validator — runs on every content change (and in CI once we have it).
 * Build plan §5.5:
 *   (a) every cell's pieces concatenate to its form
 *   (b) every unitMax >= unitIntroduced of its paradigm
 *   (c) every homograph reference resolves (and is symmetric)
 *   (d) no duplicate surface forms within the same unlocked set missing a homograph link
 * Plus structural checks: unique ids, complete r/c grid, valid roles/tiers.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const CONTENT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "content");
const ROLES = new Set(["augment", "redup", "stem", "tenseMarker", "moodMarker", "themeVowel", "ending"]);
const KINDS = new Set(["verb", "noun", "adj", "pron", "participle", "numeral"]);

const errors = [];
const err = (where, msg) => errors.push(`  ${where}: ${msg}`);

const unitFiles = readdirSync(CONTENT_DIR)
  .filter((f) => /^unit\d+\.json$/.test(f))
  .sort();

if (unitFiles.length === 0) {
  console.error("No unit files found in", CONTENT_DIR);
  process.exit(1);
}

const units = unitFiles.map((f) => ({
  file: f,
  data: JSON.parse(readFileSync(join(CONTENT_DIR, f), "utf8")),
}));

/* ---------- per-paradigm checks ---------- */
const allCells = new Map(); // "paradigmId:cellId" -> { form, unitMax, homographs, where }
const paradigmIds = new Set();

for (const { file, data } of units) {
  if (!Number.isInteger(data.unit)) err(file, "missing integer `unit`");
  if (!data.title || !data.title.trim())
    err(file, "missing `title` — the plain-English topic shown in the picker");
  for (const p of data.paradigms ?? []) {
    const where = `${file} → ${p.id}`;
    if (paradigmIds.has(p.id)) err(where, "duplicate paradigm id");
    paradigmIds.add(p.id);
    if (!KINDS.has(p.kind)) err(where, `invalid kind "${p.kind}"`);
    if (p.drillClass && !["principalParts", "wholeForm"].includes(p.drillClass))
      err(where, `invalid drillClass "${p.drillClass}"`);
    if (p.unitIntroduced !== data.unit)
      err(where, `unitIntroduced ${p.unitIntroduced} != file unit ${data.unit}`);
    const rows = p.layout?.rowLabels?.length ?? 0;
    const cols = p.layout?.colLabels?.length ?? 0;
    if (!rows || !cols) err(where, "missing layout row/col labels");

    const seenCellIds = new Set();
    const seenRC = new Set();
    for (const c of p.cells ?? []) {
      const cw = `${where}:${c.id}`;
      if (seenCellIds.has(c.id)) err(cw, "duplicate cell id");
      seenCellIds.add(c.id);
      const rc = `${c.r},${c.c}`;
      if (seenRC.has(rc)) err(cw, `duplicate grid position ${rc}`);
      seenRC.add(rc);
      if (c.r < 0 || c.r >= rows || c.c < 0 || c.c >= cols)
        err(cw, `grid position ${rc} outside ${rows}x${cols} layout`);

      // (a) pieces concatenate to form — after stored sandhi resolution (§5.5).
      // cell.sandhi is an ordered list of {seq, to} replacements applied to the
      // underlying concatenation (e.g. λείπ+σ+ω, πσ→ψ, λείψω).
      if (!Array.isArray(c.pieces) || c.pieces.length === 0) {
        err(cw, "missing pieces");
      } else {
        let concat = c.pieces.map((pc) => pc.text).join("");
        for (const rule of c.sandhi ?? []) {
          if (!concat.includes(rule.seq)) {
            err(cw, `sandhi rule "${rule.seq}"→"${rule.to}" never applies to "${concat}"`);
            continue;
          }
          concat = concat.replace(rule.seq, rule.to);
        }
        if (concat.normalize("NFC") !== c.form.normalize("NFC"))
          err(cw, `pieces concat "${concat}" != form "${c.form}"`);
        for (const pc of c.pieces)
          if (!ROLES.has(pc.role)) err(cw, `invalid piece role "${pc.role}"`);
        const endings = c.pieces.filter((pc) => pc.role === "ending");
        if (endings.length !== 1) err(cw, `expected exactly 1 ending piece, got ${endings.length}`);
      }

      // (b) unitMax >= unitIntroduced
      if (!(c.unitMax >= p.unitIntroduced))
        err(cw, `unitMax ${c.unitMax} < unitIntroduced ${p.unitIntroduced}`);

      if (![1, 2, 3].includes(c.freqTier)) err(cw, `invalid freqTier ${c.freqTier}`);

      allCells.set(`${p.id}:${c.id}`, {
        form: c.form.normalize("NFC"),
        unitMax: c.unitMax,
        homographs: c.homographs ?? [],
        where: cw,
      });
    }
    /* A grid may be legitimately sparse — the dual collapses five cases into
       two, so a dual column has no separate dative/accusative/vocative cell.
       Sparsity must be DECLARED (`layout.absent: ["2,2", …]`) so that an
       accidentally dropped cell still fails this check. */
    const absent = new Set(p.layout?.absent ?? []);
    for (const rc of absent) {
      const [ar, ac] = String(rc).split(",").map(Number);
      if (!(ar >= 0 && ar < rows && ac >= 0 && ac < cols))
        err(where, `absent position ${rc} outside ${rows}x${cols} layout`);
      if (seenRC.has(rc))
        err(where, `position ${rc} is declared absent but a cell exists there`);
    }
    if (seenCellIds.size + absent.size !== rows * cols)
      err(
        where,
        `expected ${rows * cols} cells for ${rows}x${cols} layout, got ${seenCellIds.size}` +
          (absent.size ? ` + ${absent.size} declared absent` : "")
      );
  }
}

/* ---------- (c) homograph refs resolve and are symmetric ---------- */
for (const [key, cell] of allCells) {
  for (const ref of cell.homographs) {
    const target = allCells.get(ref);
    if (!target) {
      err(cell.where, `homograph ref "${ref}" does not resolve`);
      continue;
    }
    if (target.form !== cell.form)
      err(cell.where, `homograph ref "${ref}" has different form ("${target.form}" vs "${cell.form}")`);
    if (!target.homographs.includes(key))
      err(cell.where, `homograph link to "${ref}" is not symmetric`);
  }
}

/* ---------- (d) duplicate forms must be homograph-linked ---------- */
const byForm = new Map();
for (const [key, cell] of allCells) {
  if (!byForm.has(cell.form)) byForm.set(cell.form, []);
  byForm.get(cell.form).push(key);
}
for (const [form, keys] of byForm) {
  if (keys.length < 2) continue;
  for (const key of keys) {
    const cell = allCells.get(key);
    for (const other of keys) {
      if (other === key) continue;
      if (!cell.homographs.includes(other))
        err(cell.where, `form "${form}" also at ${other} but not homograph-linked`);
    }
  }
}

/* ---------- play modes ----------
   The words a learner reads are curriculum, so modes.json is validated like
   any other content: a mode cannot ship without an explanation. */
const MODE_DESC_MAX = 90; // one comfortable line in the sheet
const MODE_NOTE_MAX = 130;
let nModes = 0;
try {
  const modeDoc = JSON.parse(readFileSync(join(CONTENT_DIR, "modes.json"), "utf8"));
  const modes = modeDoc.modes;
  if (!Array.isArray(modes) || modes.length === 0) {
    err("modes.json", "must hold a non-empty `modes` array");
  } else {
    nModes = modes.length;
    const seen = new Set();
    for (const m of modes) {
      const where = `modes.json:${m.id ?? "(no id)"}`;
      if (!m.id || !/^[a-z][a-z0-9]*$/.test(m.id))
        err(where, "id must be lowercase alphanumeric");
      if (seen.has(m.id)) err(where, "duplicate mode id");
      seen.add(m.id);
      if (!m.name?.trim()) err(where, "missing name");
      for (const [field, max] of [
        ["description", MODE_DESC_MAX],
        ["note", MODE_NOTE_MAX],
      ]) {
        const v = m[field];
        if (!v?.trim()) err(where, `missing ${field}`);
        else if (v.length > max)
          err(where, `${field} is ${v.length} chars, over the ${max} limit`);
        else if (!/[.!?]$/.test(v.trim()))
          err(where, `${field} should read as a sentence and end with punctuation`);
      }
    }
  }
} catch (e) {
  err("modes.json", `unreadable — ${e.message}`);
}

/* ---------- report ---------- */
if (errors.length) {
  console.error(`✗ Content validation FAILED — ${errors.length} error(s):`);
  for (const e of errors) console.error(e);
  process.exit(1);
}
const nParadigms = paradigmIds.size;
console.log(
  `✓ Content valid — ${unitFiles.length} unit(s), ${nParadigms} paradigm(s), ${allCells.size} cell(s), ${nModes} mode(s).`
);
