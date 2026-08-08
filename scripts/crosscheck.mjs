#!/usr/bin/env node
/**
 * Second-source cross-check (build plan §5.1 step 2).
 *
 * Reads the reference paradigm pages in ../resources (Mastronarde's Ancient
 * Greek Tutorials, atticgreek.org), extracts every attested Greek token, and
 * checks each shipped cell form against that inventory. Any form the reference
 * does not attest goes to the review queue — a human (with the book) decides.
 *
 * This is a membership check, not a slot check: it catches typos and accent
 * errors, not forms swapped between cells. The per-unit human pass against
 * H&Q remains the authority for placement (§5.1 step 4).
 *
 * Report-only: writes crosscheck-report.md and always exits 0 unless the
 * reference corpus itself failed to load.
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const CONTENT_DIR = join(HERE, "..", "src", "content");
const RESOURCE_DIR = join(HERE, "..", "..", "resources");
const REPORT = join(HERE, "..", "crosscheck-report.md");
/* Forms verified directly against book scans in ../resources/books/ (one per
   line, # comments). These count as book-attested — the book outranks the web
   reference — but keep the list curated: every entry must name its scan. */
const BOOK_ATTESTED = join(HERE, "..", "book-attested.txt");

/* Comparison normalization: NFC, macrons/breves stripped (the app prints ᾱ per
   H&Q; the reference sometimes does not). Accents and breathings are NOT
   stripped — they are exactly what we want checked. */
const normalize = (s) =>
  s
    .normalize("NFD")
    .replace(/[̄̆]/g, "")
    .normalize("NFC");

/* Tier-2 normalization: accents also stripped (breathings kept). Used for
   model-stem transposition, where accent position is not mechanically
   transferable — those matches verify the form skeleton only. */
const normalizeLoose = (s) =>
  s
    .normalize("NFD")
    .replace(/[̄̆̀́͂]/g, "")
    .normalize("NFC");

/* The reference conjugates/declines different model words than H&Q for several
   systems. Swapping our stem for theirs lets their tables vouch for our endings
   (loose match; accents remain for the human pass). Longest stems first. */
const TRANSPOSE = [
  { stems: ["πεπαίδευκ", "πεπαιδεύκ"], to: "λελυκ" }, // PP perfect act → λέλυκα (their perfect model)
  { stems: ["πεπαίδευ"], to: "λελυ" }, // PP perfect M/P → λέλυμαι
  { stems: ["παίδευ", "παιδεύ", "παιδευ"], to: "βουλευ" }, // PP παιδεύω → βουλεύω
  { stems: ["λύ", "λυ", "λῦ"], to: "βουλευ" }, // all λύω systems except the perfects (theirs are λύω too)
  { stems: ["ἔλιπ"], to: "ἤγαγ" }, // strong aorist → ἤγαγον (augment fused in their model)
  { stems: ["ἐλίπ"], to: "ἠγάγ" },
  { stems: ["τέχν", "τεχν"], to: "γνωμ" }, // η-type 1st declension → γνώμη
  { stems: ["δῶρ", "δώρ"], to: "ἐργ" }, // neuter 2nd declension → ἔργον
  { stems: ["ὁδ"], to: "ἀνθρωπ" }, // 2nd decl fem: skeleton only — ὁδός's oxytone accents are its content
  { stems: ["σώματ", "σωμάτ"], to: "πραγματ" }, // neuter τ-stem → πρᾶγμα
  { stems: ["σῶμ", "σώμ"], to: "πραγμ" },
  { stems: ["ἐλπίδ", "ἐλπίσ", "ἐλπίς"], to: (s) => s.replace("ἐλπί", "ἀσπί") }, // dental stem → ἀσπίς
  { stems: ["τιμ"], to: "ἐλ" }, // α-contract shape → contract future of ἐλαύνω (ἐλῶ, ἐλᾷς…)
  { stems: ["τιμ"], to: "ὁρ" }, // α-contract M/P → ὁράω's page (ὁρῶμαι, ὁρᾶται…); ἐλῶ has no printed middle
  { stems: ["λυτέ"], to: "ἀξί" }, // verbal adjective -τέος endings → ἄξιος's 2-1-2 paradigm
  { stems: ["κεῖ", "κεί"], to: (s) => (s === "κεῖ" ? "δύνα" : "δυνά") }, // κεῖμαι → δύναμαι (athematic middle endings)
];

function transposedVariants(form) {
  const out = [];
  for (const rule of TRANSPOSE)
    for (const stem of rule.stems) {
      const i = form.indexOf(stem);
      if (i === -1) continue;
      const to = typeof rule.to === "function" ? rule.to(stem) : rule.to;
      out.push(form.slice(0, i) + to + form.slice(i + stem.length));
      break; // one substitution per rule
    }
  return out;
}

const GREEK_TOKEN = /[Ͱ-Ͽἀ-῿][Ͱ-Ͽἀ-῿̀-ͅ]*/g;

/* ---------- build the reference inventory ---------- */
let files;
try {
  files = readdirSync(RESOURCE_DIR).filter((f) => f.endsWith(".html"));
} catch {
  console.error(`✗ No reference corpus at ${RESOURCE_DIR}`);
  process.exit(1);
}
if (files.length === 0) {
  console.error(`✗ No .html files in ${RESOURCE_DIR}`);
  process.exit(1);
}

const inventory = new Set();
const looseInventory = new Set();
for (const f of files) {
  const html = readFileSync(join(RESOURCE_DIR, f), "utf-8");
  const text = html.replace(/<[^>]+>/g, " ").normalize("NFC");
  for (const tok of text.match(GREEK_TOKEN) ?? []) {
    inventory.add(normalize(tok));
    looseInventory.add(normalizeLoose(tok));
  }
}

/* ---------- check every shipped form ---------- */
const unitFiles = readdirSync(CONTENT_DIR)
  .filter((f) => /^unit\d+\.json$/.test(f))
  .sort();

const variantsOf = (form) => {
  const bases = form.startsWith("-") ? [form, form.slice(1)] : [form];
  return bases.flatMap((f) =>
    f.includes("(ν)") ? [f.replace("(ν)", ""), f.replace("(ν)", "ν")] : [f]
  );
};

let bookSet = new Set();
try {
  bookSet = new Set(
    readFileSync(BOOK_ATTESTED, "utf-8")
      .split("\n")
      .map((l) => l.replace(/#.*/, "").trim())
      .filter(Boolean)
      .flatMap((f) => variantsOf(f))
      .map((f) => normalize(f))
  );
} catch {
  /* optional file */
}

let total = 0;
let attested = 0;
let transposed = 0;
let bookAttested = 0;
const missing = []; // {unit, paradigm, cell, form}
const transposedList = []; // {unit, paradigm, cell, form}
for (const f of unitFiles) {
  const data = JSON.parse(readFileSync(join(CONTENT_DIR, f), "utf-8"));
  for (const p of data.paradigms)
    for (const c of p.cells) {
      total++;
      const variants = variantsOf(c.form);
      if (variants.some((v) => inventory.has(normalize(v)))) {
        attested++;
        continue;
      }
      /* Two-word forms (the neuter ὅ τι is written apart to distinguish it
         from the conjunction ὅτι): attested when every word is attested. */
      if (
        c.form.includes(" ") &&
        c.form.split(" ").every((w) => inventory.has(normalize(w)))
      ) {
        attested++;
        continue;
      }
      if (variants.some((v) => bookSet.has(normalize(v)))) {
        bookAttested++;
        continue;
      }
      const alts = variants.flatMap(transposedVariants);
      if (alts.some((v) => looseInventory.has(normalizeLoose(v)))) {
        transposed++;
        transposedList.push({ unit: data.unit, paradigm: p.id, cell: c.id, form: c.form });
        continue;
      }
      missing.push({ unit: data.unit, paradigm: p.id, cell: c.id, form: c.form });
    }
}

/* ---------- report ---------- */
const byParadigm = new Map();
for (const m of missing) {
  if (!byParadigm.has(m.paradigm)) byParadigm.set(m.paradigm, []);
  byParadigm.get(m.paradigm).push(m);
}

const lines = [
  `# Cross-check report — ${new Date().toISOString().slice(0, 10)}`,
  "",
  `Reference corpus: ${files.join(", ")} (${inventory.size} distinct Greek tokens).`,
  `Shipped forms: ${total}.`,
  `- Attested exactly (accents included): ${attested}`,
  `- Attested against book scans (book-attested.txt): ${bookAttested}`,
  `- Attested via model-stem transposition (form skeleton only — ACCENTS UNCHECKED): ${transposed}`,
  `- Not covered / for review: ${missing.length}`,
  "",
  missing.length
    ? "## Review queue (not attested — human with the book decides)\n"
    : "## Every shipped form is attested in the reference.\n",
];
for (const [pid, ms] of byParadigm) {
  lines.push(`### ${pid} (unit ${ms[0].unit}) — ${ms.length} form(s)`);
  for (const m of ms) lines.push(`- \`${m.cell}\` ${m.form}`);
  lines.push("");
}
if (transposedList.length) {
  lines.push("## Attested by transposition (accent check still needed)\n");
  const byP = new Map();
  for (const m of transposedList) {
    if (!byP.has(m.paradigm)) byP.set(m.paradigm, []);
    byP.get(m.paradigm).push(m);
  }
  for (const [pid, ms] of byP)
    lines.push(`- ${pid}: ${ms.map((m) => m.form).join(", ")}`);
  lines.push("");
}
lines.push(
  "_A paradigm with ALL its cells in the review queue is most likely simply not",
  "covered by the saved reference pages (the μι-verb/irregular tables live on",
  "atticgreek.org's paradigmtables5 page, not yet saved), rather than wrong.",
  "Scattered single cells are the ones to scrutinize._"
);
writeFileSync(REPORT, lines.join("\n"));

console.log(
  `Cross-check: ${attested} exact + ${bookAttested} book-scan + ${transposed} transposed of ${total} forms; ${missing.length} queued for review.`
);
console.log(`Report: ${REPORT}`);
