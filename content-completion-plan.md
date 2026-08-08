# Content Completion Plan

**Status:** CONTENT COMPLETE — Phases 0–7 done (2026-08-08). Open: Phase 8 process debt (see below) + deferred §142 + backlog (μι-verb imperatives, γνω- moods)
**Written:** 2026-08-07 · sources re-audited same day (§2)
**Governed by:** `paradeigma-build-plan.md` §5 (content pipeline) and §9 (definition of done).
Nothing here overrides that document; this is the plan for closing its §5.2 inventory.

---

## 1. Where we are, measured

| | authored | build plan §5.2 estimate |
| --- | --- | --- |
| Tables | 122 | 150–200 |
| Cells | 916 | 2,500–4,000 |

The table count looks closer than it is: the authored tables are small (6–12 cells) and
most of what is missing is large (an adjective declines across three genders). By cell
volume we are at roughly **a quarter to a third** of the estimate.

### Categories with nothing authored

| Category | Tables now |
| --- | --- |
| Infinitives — every tense/voice | **0** |
| Imperatives | **0** |
| Adjectives — 2-1-2, 3rd-decl, πᾶς/μέγας/πολύς, comparison | **0** |
| Numerals — εἷς, δύο, τρεῖς, τέτταρες | **0** |
| Unit 20 — verbal adjectives, κεῖμαι, νοῦς, ἄστυ | **0** |

### Partially covered

- **Pronouns** — have αὐτός, τίς. Missing: personal (ἐγώ/σύ), demonstratives
  (οὗτος, ὅδε, ἐκεῖνος), relative ὅς, indefinite τις, reflexives, reciprocal ἀλλήλων.
- **Third declension** — have velar (φύλαξ), dental (ἐλπίς, σῶμα), nasal (δαίμων),
  liquid (ῥήτωρ), σ-stem (γένος). Missing: **labial stops, ι-stems (πόλις), υ-stems
  (πῆχυς, ἄστυ), diphthong stems (βασιλεύς, ναῦς)**.
- **First declension** — missing the **masculines in -ης/-ᾱς** (πολίτης, νεᾱνίᾱς).
- **Contract verbs** — -έω has active and M/P; -άω and -όω have active only.

Projected on completion: **≈195 tables, ≈2,100 cells** — see §3G, which now includes
duals and vocatives per the founder's ruling of 2026-08-07. That lands inside the build
plan's table estimate and at the low end of its cell estimate.

---

## 2. Sources — audited 2026-08-07

### 2.1 The HTML resources cover every missing category. Verified.

An earlier draft of this plan claimed new book scans were needed before authoring could
start. **That was wrong.** A table-by-table audit of `resources/*.html` (Mastronarde's
paradigm pages, already the crosscheck's source) found every missing category present:

| Needed | Present as |
| --- | --- |
| 1st-decl masculines | `noun-declensions` #4 — νεανίᾱς, στρατιώτης |
| ι/υ-stems | #13 — πόλις, πῆχυς, ἄστυ, ἰχθύς |
| Diphthong stems | #14 — ἱππεύς, ναῦς, γραῦς, βοῦς |
| Labial stops | #5 — κλώψ (alongside φύλαξ) |
| Contracted nouns (νοῦς) | #15–16, plus Attic declension #17 and -ως nouns #18 |
| 2-1-2 adjectives | `paradigmsAdjectives` #19 — ἄξιος **and** ἀγαθός, ᾱ- and η-feminines side by side |
| 2-ending, consonant-decl. adjectives | #20–21 |
| πᾶς, μέγας, πολύς | #22–24 (υ/ν-stems, ντ-stems, variant stems) |
| Comparatives | #26 |
| Contract adjectives | #27–29 |
| Numerals 1–4 | #25 — εἷς/μίᾰ/ἕν, οὐδείς, δύο, τρεῖς, τέτταρες |
| Pronouns (all) | `pronoun` #27–39 — article, personal, αὐτός, οὗτος/ὅδε/ἐκεῖνος, interrogative/indefinite, relative, indefinite relative, reflexives ×3, reciprocal, τοιοῦτος |
| **Infinitives** | inline in every verb system table (`infinitive` row) |
| **Imperatives** | inline in every verb system table (`imperative` column) |
| Future passive, athematic perfects, periphrastics | `paradigmsVerbs1–3` #10–17 |
| Duals and vocatives | present throughout every noun/adjective/pronoun/verb table |

The model words differ from ours (βουλεύω not λύω; στρατιώτης not πολίτης), which is why a
naive lemma search suggested gaps that are not there.

**Consequence: no new scans are required to author any of §1.** Correctness is covered.

### 2.2 Operational note — normalise before comparing

These files use the *oxia* codepoints (ἀγαθός with U+1F79) where the app uses *tonos*
(U+03CC). A raw string comparison fails; NFC normalisation maps one to the other.
`scripts/crosscheck.mjs` already does this correctly (it NFC-normalises both the page text
and each token), so the existing 912/916 attestation figure stands. Any *new* ad-hoc
checking must normalise too — this cost an hour of wrong conclusions.

### 2.3 What the book is still needed for

Placement, and only placement. `resources/*.html` is Mastronarde's own paradigm numbering,
not H&Q's unit sequence, and build plan §5.2 is explicit that the per-unit inventory must
come from the book — no online syllabus, including this document, may be trusted for it.

But this blocks far less than the earlier draft assumed, for two reasons:

1. **Several placements are already fixed** by the verified unit titles: Unit 4 concludes
   the first declension (so the masculines belong at or before it), Unit 6 is third-decl
   consonant stems (labials), Unit 10 is "more third declension" (ι/υ and diphthong stems),
   and **Unit 20's title names its own content outright** — verbal adjectives, κεῖμαι,
   νοῦς, ἄστυ.
2. **Placement errors in the "too late" direction are safe.** The gate's promise is that
   nothing is shown *above* your unit. Attaching a table to a later unit than H&Q does
   never violates that; it only delays the reveal. Attaching it *early* would. So where the
   unit is genuinely unknown, author it at the latest defensible unit, flag the row in
   `corrections.md`, and correct it when the book is consulted.

`brew install poppler` would let me read `resources/books/*.pdf` directly and settle
placement precisely. It is a convenience now, not a blocker.

---

## 3. Schema decisions to settle before authoring

These change the shape of the data, so getting them wrong means re-authoring. All are new
table *shapes* the app has not rendered before.

**A. Infinitives — a tense × voice grid, not a list.**
Rows = present, future, aorist, perfect; columns = active, middle, passive. Empty
intersections simply have no cell (`Row` already renders a gap for a missing r/c). This
teaches the matrix rather than a flat list, and every mechanic works on it unchanged.
Individual cells carry their own `unitMax`, so the grid reveals itself as tenses arrive.

**B. Imperatives — person × number, one table per tense/voice.**
Rows = 2nd, 3rd; columns = singular, plural.

**C. Adjectives — follow the participle precedent: a singular table and a plural table.**
Columns = masculine, feminine, neuter; rows = nominative, genitive, dative, accusative.
24 cells per lexeme. A 30-cell single table is unusable on a phone; the participles
already proved the sg/pl split works.

**D. Adjective tables will be homograph-dense, and that is the point.**
Masculine and neuter share genitive and dative throughout. The validator *requires*
duplicate forms to be homograph-linked symmetrically, so each adjective adds real linking
work — and in exchange Lookup will demand every valid cell, which is exactly the syncretism
a reader must internalise. Budget for it; do not shortcut it.

**E. Personal pronouns have no gender.**
ἐγώ/σύ decline by case × number only. Demonstratives behave like adjectives (rule C).

**F. Contract adjectives (χρυσοῦς) need `sandhi`,** the same as contract verbs. Defer them
to the adjective tail (Phase 5) so the pattern is settled first.

**G. Duals and vocatives are IN — founder's ruling, 2026-08-07.**
Settling build plan §8.2 and the standing vocative question. Both are present in every
relevant source table (§2.1), so this costs authoring time, not research.

- **Vocative** becomes a fifth row on noun, adjective, pronoun and participle tables.
  Where it is identical to the nominative — which is most of the time — it is a homograph
  and must be linked (rule D).
- **Dual** becomes a third number. H&Q and Mastronarde both collapse it to two cells per
  table: `n.a.v.` (nominative/accusative/vocative) and `g.d.` (genitive/dative). Model it
  that way rather than as a full case set — inventing four dual cells where the language
  has two would be teaching a falsehood.
- **Tier both at 3**, per §8.2's recommendation: they are real, they are drilled, but they
  are weighted below the core. This also finally populates tier 3, which is empty today
  and therefore untested against real data.
- **Retrofit before Phase 1.** The 12 existing noun tables and 24 participle tables predate
  this ruling and need the rows added. Doing it first means one pass; doing it later means
  re-opening every table authored in between. This is Phase 0.5.

---

## 4. Phases

Ordered by **when the drill actually needs it** — the founder is on Unit 3 — and within a
phase by shared decomposition pattern, since §5.2 notes cells in a pattern differ only by
stem. Each phase ships independently: authored, validated, cross-checked, drillable.

### Phase 0 — Placement map ✅ done 2026-08-07

poppler installed; `HQ-table-content.pdf` read directly. The ToC carries H&Q's full
section numbering (§13–§153), so **placement is now fixed, not provisional**, for every
category except the middle/passive infinitives. The map lives in `corrections.md`.

It overturned two of my working assumptions:

- **Infinitives are Unit 2 (§26)** — one unit behind where the founder is drilling. The
  most overdue gap in the app, and the "place it late when unsure" heuristic would have
  buried it.
- **Adjectives begin at Unit 4 (§38)** and arrive across *seven* separate introductions
  (§38, §71, §83, §127, §129–131, §142). They cannot ship as one block without lying
  about placement.

Also: **the future infinitive is Unit 16 (§124), not Unit 2** — so the infinitive grid
gates its future row at `unitMax: 16`, which is precisely what per-cell `unitMax` is for.

### Phase 0.5 — Retrofit duals and vocatives ✅ done 2026-08-07

**Nouns:** all 12 tables got a Voc row (vs/vp) and a sparse dual column (dn = n.a.v.,
dg = g.d.), 48 cells at tier 3 — the first tier-3 cells in the app. The dual column is
*declared* sparse (`layout.absent`), a schema addition: an undeclared hole still fails
validation, which immediately caught 28 tables my first script mis-tagged.

**Participles: the book overruled the plan.** H&Q §66 prints no participle duals and no
separate vocative — its rows read "Nom./Voc." So the 24 participle tables got a row
relabel (Nom → Nom/Voc) and nothing else. The original "retrofit 24 participle tables"
scope was wrong and is void; scans outrank plans.

Also fixed en route: 3-column grids overflowed their panel by 13 px at 375 px (the risk
register's "never rendered on a phone" row, caught by the layout pass) — wide grids now
tighten label gutter, padding and one font step, with a no-clipped-Greek check.

Queue: γενοῖν (source misprints "γένοῖν" with two accents — authored the correct form),
ἐλπί (voc; parallel to attested ἀσπί but outside the transposer's stem map). Both await
the book check. 964 cells; 101 tests; all gates green.

Phases now follow the founder's path through the book, using the fixed placements.

### Phase 1 — Units 2–4, the overdue ones ✅ done 2026-08-07

108 cells shipped: the λύω infinitive grid (12 — the app's **first mixed-gate table**,
U2 present/aorist active, U3 perfect, U5/U7 passive/middle provisional, U16 futures),
νεανίᾱς + στρατιώτης (24), ἀγαθός + ἄξιος sg/pl/dual (72). **1072 cells total.**

The mixed-gate table forced two engine fixes the plan had not foreseen: locked-cell
rendering in `Cell` (ungated forms would have displayed, and Scramble would have offered
them as slots grading ignores — an unsolvable board), and gate-aware gold counts
everywhere (a 3-reachable-cell table read "0/12"). Locked cells show 🔒 plus the unit
that unlocks them — per-cell runway, matching the Tables sheet's locked row.

Gates: validator, 101 tests, build, crosscheck 606 exact + 255 book + 204 transposed;
queue 7 (λῦσαι joined — the transposer lacks the circumflexed βουλεῦ- mapping; the form
is standard and awaits the book check). ἀγαθός sg (15 cells, three genders) fits a
375 px phone with nothing clipped; the U4 unlock announces all eight new tables.

### Phase 2 — Units 6–9: relative, demonstratives, πᾶς ✅ done 2026-08-07

134 cells / 14 tables shipped; **1206 total**, all new forms attested exactly.
Three design rulings recorded in `corrections.md`: pronoun duals are 2×1 ("all genders" —
one form serves all three), ὅς and ὅδε drill as **wholeForm** (stem+ending splitting made
degenerate drills: empty-ending monosyllables, or δε as every answer), and πᾶς carries
real ντ-stem sandhi (παντ+ς → πᾶς) so the collapse animation teaches H&Q §48's sound
changes. πᾶς has no dual — the source prints none.

### Phase 3 — Unit 10: third declension and adjectives ✅ done 2026-08-07

104 cells / 13 tables; **1310 total**; queue steady at 7. πόλις/πῆχυς/ἱππεύς (§82),
ἀληθής + σώφρων with duals (§83), contracted futures βαλῶ/ἐλῶ (§85) built as structural
transpositions of the ποιέω/τιμάω presents (conventions inherited, cannot drift), and the
-άω/-όω middle-passives (τιμάω M/P landing at U9 beside its active). The new
**drill-sanity check** (reject mostly-empty or all-identical endings) caught σώφρων sg —
now wholeForm. ναῦς and ἄστυ deliberately deferred to their ToC units (16, 20).

### Phase 4 — Unit 11: the imperative mood ✅ done 2026-08-07

20 cells / 5 tables: λύω imperatives — present act, present M/P, aorist act/mid/pass.
**1330 total; queue down to 6** (λῦσαι attested once the transposer learned the
circumflexed λῦ stem). The aor mid impv λῦσαι ↔ aor act infinitive λῦσαι homograph now
links the famous triple across paradigms. No verb duals (consistent with every finite-verb
table); no deponent tables (§93–95 is usage, not new morphology — logged). **μι-verb
imperatives deferred** to a μι-verb pass alongside the two-person verification debt —
they belong with those tables, not here.

### Phase 5 — Units 15–16 ✅ done 2026-08-07

128 cells / 16 tables; **1458 total**; queue 6; every new form attested. ἐγώ/σύ are
wholeForm (suppletive — no shared stem to scaffold) with their duals νώ/σφώ; reflexives
have no nominative by design; indefinite τις teaches the enclitic-accent contrast against
the interrogative; πολύς has neither dual nor vocative (source prints none); ναῦς brought
the app's first diaeresis (νηΐ), which **exposed and fixed a real accent-engine bug** —
applyAccent composed ι+́+̈ (uncomposable) instead of ι+̈+́ (ΐ). **§124 cost nothing**:
Phase 1's future-infinitive cells simply unlocked at 16, as the mixed-gate design intended.
γνω- subjunctive/optative/imperative deferred to the μι-verb pass.

### Phase 6 — Units 17–18 ✅ done 2026-08-07 (U19 §142 deferred)

154 cells / 16 tables; **1612 total / 195 paradigms — inside the build plan's table
estimate**; queue 6; every new form attested. μέγας and ἡδύς with duals; καλλίων sg/pl
(the -ίων comparative declension — placement at §131/U17 provisional vs §142/U19);
εἷς/οὐδείς/δύο/τρεῖς/τέτταρες; ὅστις wholeForm with the two-word neuter ὅ τι (crosscheck
now attests spaced forms word-by-word). **§142's irregular-comparison lexical list is
deferred**: μείζων/ἀμείνων/βελτίων are absent from the reference corpus and would ship
unattested — it waits for book pages.

### Phase 7 — Unit 20 ✅ done 2026-08-08

60 cells / 5 tables: λυτέος sg+pl, κεῖμαι, νοῦς, ἄστυ. **Unit 20 is no longer empty —
build plan §9's failing clause is closed. 1,672 cells / 200 paradigms / 20 of 20 units.**
Transposer extended (λυτέ→ἀξί, κεῖ→δύνα) so everything attests; queue 6. The νώ dual is
now a genuine noun/pronoun cross-paradigm homograph.

### Phase 8 — Process debt

Not content, but the plan's own outstanding commitments:

1. **Two-person independent verification of the μι-verb tables** (build plan §6 Phase 4
   acceptance, §8.4). Still one person. The plan explicitly budgets for this because
   generators disagree most here. **I cannot be the second person.**
2. **Duals** (§8.2) — the plan recommends authoring them at tier 3, excluded from default
   scheduling, behind an "include duals" toggle. Zero exist; the decision was never
   confirmed.
3. **Tier 3 is empty** — every cell is tier 1 or 2, so the tier-3 scheduler weighting has
   never run against real data. Resolving duals and rare vocatives populates it.
4. **λείπω's 4 principal parts** — still the only entries in the crosscheck review queue.
5. **Feel QA** (§7) — ✅ measured 2026-08-08: tap-to-feedback 0.3–0.5 ms (synchronous
   within the click dispatch), three orders of magnitude inside the 100 ms budget. The
   90 s round criterion is player-dominated (app imposes ~1.3 s/cell); founder's real
   run is the honest full test.

---

## 5. Per-phase working loop

Unchanged from build plan §5.1, stated here so it is followed the same way each time:

1. **Placement** confirmed from the book (Phase 0 table).
2. **Author** the JSON with hand-written piece decompositions and `freqTier`.
3. **`npm run validate`** — concatenation, unitMax, homograph symmetry, grid completeness.
4. **`npm run crosscheck`** — every form attested against a second source; anything
   unattested goes to the review queue, not into a release. Never hand-compare Greek
   without NFC-normalising first (§2.2); the script does, ad-hoc greps do not.
5. **`npm test`** — the gating sweep proves no new cell leaks above its unit.
6. **Browser pass** at 375 px — new table shapes are new layout risk. Grids wider than the
   authored norm (three gender columns) have never been rendered on a phone.
7. **Log** every judgment call in `corrections.md`.

---

## 6. Risk register

| Risk | Why it matters | Mitigation |
| --- | --- | --- |
| Wrong `unitIntroduced` | Placing a table EARLY breaks the gate, the app's central promise | "Too late is safe" (§2.3.2): provisional rows go to the latest defensible unit, never the earliest |
| Adding duals/vocatives after authoring | Would mean re-opening every noun and adjective table to add a row | Settled (§3G) and retrofitted first (Phase 0.5) |
| A 5-row table with duals on a 375 px phone | Never rendered; the tallest table yet | Browser pass is part of Phase 0.5's acceptance |
| Three-gender tables on a 375 px phone | Never rendered; columns may not fit | Browser pass in every phase's loop (§5.6) |
| Homograph density in adjectives | Validator will reject unlinked duplicates; easy to under-link | Rule D; treat linking as part of authoring, not cleanup |
| μι-verbs still single-verified | The plan's own stated highest-risk area | Phase 7.1 — needs a second human |
| Scan availability | Every phase is gated on the book | Appendix pages first (Phase 0.3) — one request covers most phases |
| Scope creep into a reading app | §8.5 warns about it explicitly | Out of scope, permanently |

---

## 7. What is needed from the founder

Nothing blocks the start of authoring. In rough order of value:

1. **A second reader for the μι-verb tables** (Phase 8.1). The build plan's own Phase 4
   acceptance criterion, still unmet, and explicitly not something I can be. This is now
   the only outstanding ask.
2. *Optional:* the Appendix paradigm pages, if any placement stays provisional after the
   ToC is read.

**Settled 2026-08-07:** duals and vocatives are in (§3G); poppler installed, so placement
comes from the book directly.
