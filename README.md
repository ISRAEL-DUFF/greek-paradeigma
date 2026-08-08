# Παράδειγμα

A paradigm-mastery game for **Attic Greek**, keyed unit-by-unit to Hansen & Quinn,
*Greek: An Intensive Course* (2nd revised ed., 1992).

It is a single-player, local-first, offline-capable morphology trainer. No accounts,
no backend, no network. You drill declension and conjugation tables until every cell
is gold, and the app makes sure you are never shown a form your unit has not reached.

**Current coverage:** 20 units · 200 tables · 1,672 fully decomposed cells — every H&Q unit has its content authored, including duals and vocatives.

---

## Why it exists

Students are tested on charts and picture charts when recalling. This app does not
fight that — it makes the chart itself the game board. Every mechanic exists to force
**production and recognition against the table**, and animation is used to teach *why*
a cell contains what it contains, never as decoration.

Three principles govern every feature:

1. **Per-cell mastery, not per-table.** The unit of memory is a single form.
   Scheduling, decay, and reward all operate at cell granularity. A table is done
   only when every cell is gold.
2. **Distractors are real neighbours.** Wrong chips are always genuine endings from
   adjacent cells or adjacent paradigms — the confusions an exam actually punishes —
   never random strings.
3. **Unit gating is sacred.** No form is ever shown or drilled that requires grammar
   beyond your current unit. Every cell carries a `unitMax`, every query filters on
   it, and an automated test sweeps all 20 units asserting that no chip in any tray
   ever leaks from the future. This is the single biggest failure of general-purpose
   Anki decks for this textbook.

**Out of scope by design:** translation, vocabulary flashcards, sentence reading,
syntax drills, accounts, monetization.

---

## Quick start

```bash
npm install
npm run dev
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run build` | Production build + PWA service worker |
| `npm run preview` | Serve the production build |
| `npm test` | Vitest suite (101 tests) |
| `npm run validate` | Structural + morphological validation of all content |
| `npm run crosscheck` | Compare every form against the external reference corpus |
| `npm run check` | `validate` + `test` — run this before committing |

The app installs as a PWA and works fully offline once loaded, which is the point:
it is meant to be drilled on a phone.

---

## How the game works

### The board

A table is a grid of cells. Each cell holds one fully accented surface form, split
into ordered **morphemes** with roles — `augment`, `redup`, `stem`, `tenseMarker`,
`moodMarker`, `themeVowel`, `ending`. That decomposition is what makes the teaching
animations possible, and it is authored by hand for every cell.

You never type. You answer by tapping **chips** — or, in Scramble, by dragging whole
forms into place.

### Mastery, gold, and decay

Every cell carries a mastery level from 0 to 3.

| Event | Effect |
| --- | --- |
| Correct | **+1** |
| Correct in under 2.5 s (`ταχύς`) | **+2** |
| Wrong | **−1** (floor 0) |
| Reaching level 3 | The cell **gilds** — gold shimmer, and it stays visible as scaffolding |

Gold decays with time, because knowing a form last week is not knowing it:

- untouched for **4 days** → drops to level 2 (the gold visibly dulls)
- untouched for **10 days** → drops to level 1

Decay is applied once at app start, so returning after a break really does re-open
the tables you have been neglecting.

### Two levels of asking

- **Level 1 — Build.** The cell shows its stem as scaffolding and you tap the correct
  **ending** from six chips.
- **Level 2 — Assemble.** Once a cell reaches mastery 2, it demands the whole form
  **piece by piece, in order** — augment, then stem, then ending. The prompt shows the
  plan as a live stepper with the current morpheme glowing.

In assembly, not every wrong tap is a wrong answer:

- A **refusal chip** — a morpheme this form *cannot* take, like an augment offered on a
  present tense — bounces with a teaching line ("augment ἐ-: past indicative only")
  and costs nothing. These refusal strings are curriculum and live in
  [`src/content/refusals.json`](src/content/refusals.json), not in code.
- A **real piece tapped out of order** — most commonly the ending, which is what you
  have been trained to tap — also bounces, with an ordering hint, and costs nothing.
- Only a piece that belongs to **no part of this form** counts as wrong and costs a
  mastery level.

### The accent finishing move

After a correct assembly, the bare form re-renders with tappable vowel slots. You
cycle each through none → acute → circumflex and confirm. Accent accuracy is tracked
in **its own score channel** (shown in the header) and never touches form mastery —
verb accents are rule-driven and noun accents lexical, so they are a separate skill.

Slot detection is diphthong-aware and preserves breathings and iota subscripts; a test
round-trips all 1,672 shipped forms through it.

---

## The seven play modes

### Fill
The core loop. You study the full table, press begin, and it **decays away** — then you
refill the blanks. Only cells below gold blank; gilded cells stay on screen as landmarks.

When a table is **fully gilded** the round becomes a **defence round**: every cell
blanks, including the gold ones, and since they are all at mastery 3 they are all
drilled at assembly level. Gold must be defended. The button reads **Defend it**.

### Snipe
Cross-table practice. The scheduler picks one weak cell at a time from *everything*
you have unlocked, weakest-first, weighted by frequency tier, and jumps you to its
table. It follows a **70/30 split** — roughly 70 % from your current unit, 30 %
interleaved from earlier units. Interleaving feels worse and works better; it is
deliberate. If every cell is gold, Snipe defends the longest-unseen one.

### Impostor
The table is shown **complete but with one form falsified**. You find it. The fake is
built from a real neighbouring ending within your unit gate, and is checked so that it
can never accidentally spell a form that is genuinely correct somewhere else, and never
double-accents into something visibly absurd. For principal-parts and irregular charts
the swap is a whole word from a sibling verb — ἔλυσα sitting where ἔλαβον belongs.

### Lookup
Reverse recognition. A surface form appears above a darkened table and you tap the cell
where it lives. **When the form is ambiguous you must find every valid cell** — ἔλυον is
both 1st singular and 3rd plural, and the round will not complete until you have
identified both. That ambiguity training is what reading actually requires. Gilded cells
stay visible as orientation landmarks; latency is scored.

### Twin
Two related tables side by side, drilled together with their blanks interleaved. The
pairing is not random: it scores every same-kind pair by the confusions you have
actually recorded — the chips you keep wrongly choosing that belong to the sibling —
plus shared weakness. So it puts the present against the imperfect, or the thematic
against the contract, precisely where *you* are conflating them. Stacks on mobile with
sticky headers.

### Race
Pure chant memory under pressure. The whole table blanks, gold included, against a
**60-second clock**, answered column by column at Level 1 only. Mistakes cost time, not
mastery — the race never touches your record. Personal bests are stored per table.

### Scramble
Rebuild the whole paradigm at once. The table appears **completely empty** and all of
its forms sit loose in a bank below, shuffled. You **drag** each form into the cell
where it belongs — dragging a placed form back to the bank undoes it, and dropping onto
an occupied cell displaces the occupant back to the bank rather than losing it. **Check**
stays disabled until every slot is filled, with a running "N left" counter; it then
judges the whole arrangement and marks the misplaced cells in red so you can fix them.

Scoring rewards solving over guessing: a fully correct table gives **+1 to every cell**
(+2 if fast), while a failed check costs **−1 only on the cells that are actually
misplaced** — so repeated check-and-shuffle is net negative.

Where the other modes ask one question at a time, this one makes you hold the entire
system at once, and elimination becomes part of the reasoning. It is also the mode where
homographs show themselves most plainly: a table containing one puts **two identical
tiles in the bank** — two ἔλυον for the imperfect, three αὐτῶν for αὐτός plural — and
either tile satisfies either cell, because correctness is judged by comparing the *form*
in each cell against that cell's form, never by tracking which tile went where.

Dragging is implemented on Pointer Events rather than HTML5 drag-and-drop, so it works
on touch as well as mouse, and the page auto-scrolls while you drag so that the lower
rows of a tall table stay reachable from behind the pinned bank.

The bank is **two rows that scroll sideways**, however many forms it holds. Vertical
space is what the board needs and horizontal space is what is going spare, so the bank
trades height for width: a 12-form participle bank is a fixed 108 px rather than wrapping
into a 179 px block. Two rows rather than one because a single strip showed only about
three of twelve forms at a time.

Because the bank pans horizontally, its tiles set `touch-action: pan-x`: a sideways swipe
scrolls it, while lifting a form out — always an upward motion — comes through as a drag.
A tile is not picked up until the pointer has travelled 6 px, so taps and swipes never
flash a ghost, and `pointercancel` (fired when the browser takes the gesture over to pan)
puts the tile back rather than dropping it.

**Two session flows**, chosen by the *after solving* toggle and remembered:

- **Same table** (default) — hands the same paradigm back, reshuffled, so you can drill
  one table until it is genuinely yours.
- **Next table** — serves a *different* paradigm, chosen the way Snipe schedules but
  scored over whole tables: how far the table as a whole still is from gold, weighted by
  frequency tier, ~70 % from the current unit and ~30 % interleaved from earlier ones,
  and never the table you just finished. Once everything is gilded it offers the
  least-recently-practised table.

A running *"N restored"* counter tracks the session.

---

## The shell

The paradigm is the product, so it gets the screen. Everything else is one line.

```
┌──────────────────────────────────────┐
│ ☰   UNIT 3 · τέχνη ▾      [ FILL ]   │  48 px
├──────────────────────────────────────┤
│ ▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │   2 px  gild rule
│              THE BOARD               │  everything else
├──────────────────────────────────────┤
│  prompt banner + tray / bank         │  pinned on a phone, inline on desktop
└──────────────────────────────────────┘
```

Controls are placed by **how often they are touched**. Nothing above is touched
per-answer, so nothing above takes permanent space. This replaced ~514 px of stacked
chrome — 63 % of a 375 × 812 phone, which left the board 42 px in its natural position.

**The breadcrumb names what is on the board right now** — not the table you last picked.
Snipe moves you between tables and the bar follows, or it would lie. Twin puts two tables
on the board, so it shows both: `τέχνη ⇄ χώρᾱ`, with the unit label dropped because twins
can cross units.

**The gild rule** under the bar is table-local: it fills as *this* table approaches gold,
so it moves while you play. Twin splits it into two segments, one per table, rather than
averaging them and hiding a weak half.

### Sheets

Three bottom sheets, summoned from the bar. They sit **over** a dimmed board rather than
replacing it, so you always choose in relation to what you were looking at, and they stay
open until you dismiss them — swipe down, tap the scrim, or press `Esc`. Picking a table
does not close the sheet; the board changes behind it and you can keep browsing.

- **Tables** — search, *by unit / weakest first / unfinished*, and a **locked row** showing
  the next unit greyed out. Locked units used to simply not render, which made the gate
  invisible; showing it turns a restriction into visible runway.
- **How to drill** — the seven modes, each with a sentence and a note. `TWIN` and
  `IMPOSTOR` were opaque as bare labels; the words live in
  [`src/content/modes.json`](src/content/modes.json), because what a learner reads is
  curriculum.
- **Progress & syllabus** — gilded / accents / tables done, the unit gate, the sprint
  planner, and an explanation of how gold decays.

The **unit gate lives in Settings and nowhere else**, precisely because it is global: a
mis-tap on the old always-visible stepper silently changed what the entire app would show.
Advancing it dismisses the sheet and shows a "new tables unlocked" screen.

### Round end

One screen answers "what now?" for every mode that ends — Fill, Twin, Race and Scramble.
The other three do not end: Snipe re-aims and Lookup and Impostor auto-advance, so they
are continuous streams.

It offers the obvious next action, and then **"or try this table as…"** with the sibling
modes — the honest moment to choose a mode is when something finishes, not from a
permanent rack of chips. Snipe is never offered (cross-table by definition) and neither is
Twin (it needs a pair). The Race suggestion carries your personal best for that table.

### Desktop

At ≥ 1024 px the layout stops being a phone. Horizontal space is the spare axis, so:

- **Tables becomes a permanent left rail** — the whole syllabus always in view. It renders
  the same component the sheet does; only the container differs.
- **Nothing is pinned.** The prompt banner and tray sit inline beneath the board, so the
  board cannot be occluded — the failure mode is designed out rather than guarded against.
- The Scramble bank widens, since it is the one element that wants the spare axis.

Modes and Settings stay sheets at every width.

### Other features

**Syllabus sprint planner.** Tell it which unit your class is on and how far ahead you want
to stay; it reports *sprint on track (+N)* or offers a one-tap jump when you fall behind.
You are meant to drill *ahead* of your class, so progression is never locked behind mastery.

**Confusion-driven trays.** Every wrong chip you tap is recorded against that cell. The
tray then *guarantees* your top confusion reappears as a distractor until you stop
choosing it.

---

## Content model

One JSON file per unit in [`src/content/`](src/content). A unit has a `title` (the
plain-English topic) and a list of paradigms; a paradigm has a layout and cells.

```jsonc
{
  "id": "verb.luo.impf.act.ind",
  "kind": "verb",                    // verb | noun | adj | pron | participle | numeral
  "drillClass": null,                // or "principalParts" | "wholeForm"
  "lemma": "λύω",
  "label": "λύω — Imperfect Active Indicative",
  "short": "Imperfect",              // chip label
  "unitIntroduced": 2,
  "layout": { "rowLabels": ["1st","2nd","3rd"], "colLabels": ["singular","plural"] },
  "notes": "The augment ἐ- marks past time…",   // teaching line on the round summary
  "cells": [
    {
      "id": "1s", "r": 0, "c": 0,
      "form": "ἔλυον",
      "pieces": [
        { "text": "ἔ",  "role": "augment" },
        { "text": "λυ", "role": "stem" },
        { "text": "ον", "role": "ending" }
      ],
      "unitMax": 2,
      "freqTier": 1,                                  // 1 core · 2 standard · 3 rare
      "homographs": ["verb.luo.impf.act.ind:3p"],     // symmetric, validated
      "unlockMsg": "λιπ- acquired — …"                // principal parts only
    }
  ]
}
```

Notable pieces of the schema:

- **`sandhi`** — for forms where the morphemes do not simply concatenate, the cell
  stores the *underlying* pieces plus ordered rewrite rules: `λείπ + σ + ω` with
  `πσ → ψ` gives `λείψω`. Contract verbs, stop-stem futures, and third-declension
  datives all use this. On a correct answer the underlying split is shown and then
  visibly **collapses** into the surface form.
- **`drillClass`** — principal-parts charts and suppletive irregulars (εἰμί, οἶδα,
  φημί, εἶμι) are drilled as **whole words** rather than endings, and their chip pools
  are firewalled from ending-based tables in both directions.
- **`homographs`** — every pair of identical forms anywhere in the corpus must be
  linked symmetrically. This drives Lookup's find-them-all requirement.
- **`freqTier`** — weights how often the scheduler volunteers a cell. Nothing is ever
  hidden; rare cells simply come up less.

---

## Correctness

The Greek is the product. Three independent gates:

**1. `npm run validate`** — structural and morphological integrity of the content:
pieces concatenate to the form after sandhi resolution, exactly one ending per cell,
every `unitMax ≥ unitIntroduced`, homograph links resolve *and* are symmetric, no
duplicate form anywhere is left unlinked, grids are complete, every unit has a title.

**2. `npm run crosscheck`** — every shipped form checked against an independent
reference corpus (Mastronarde's *Ancient Greek Tutorials* paradigm pages) plus the
book scans, writing a human review queue to `crosscheck-report.md`. Three tiers:
exact match including accents; match by model-stem transposition (their βουλεύω
vouching for our λύω — skeleton only, accents still human-checked); and forms attested
only against a book scan, listed with their source PDF in `book-attested.txt`.

Current standing: **1,666 of 1,672 forms attested** (1,128 exact, 255 book-scan, 283 transposed); queue = λείπω's four principal parts, ἐλπί, γενοῖν — all awaiting the book check.

**3. `npm test`** — 101 tests over the pure logic:
- the unit-gating sweep across all 20 units (no tray or assembly chip from the future)
- every tray contains its own answer; no duplicate, ungradeable chips
- assembly grading, including the regression that tapping the correct ending first must
  teach rather than penalize
- impostor honesty (never spells a genuine form; never reuses its own)
- Lookup requires every homograph cell
- accent round-trip over all 1,672 forms
- decay thresholds, homograph symmetry, round composition

Answer grading and round composition deliberately live in a pure, React-free module,
[`src/grading.js`](src/grading.js), *so that they can be tested*. Please keep them there.
The same applies to `scheduler.js`, `accent.js` and `sheet.js`.

**4. `scripts/measure-layout.js`** — the gate the other three cannot be.

The one bug class that has repeatedly escaped this project is *"element A is hidden behind
element B"*: the chip tray over the active cell, the Scramble bank over its drop targets,
the unlock overlay behind the sheet that opened it. Vitest runs in jsdom, which has **no
layout engine**, so no unit test can ever catch these. Paste this into the browser console
with the dev server running:

```js
await measureLayout()   // every mode, current viewport
```

Every row must report `ok: true`. Run it at 375, 768 and 1280 px after any layout change.
A related trap: text rendered in `C.line` — the *border* colour — is invisible against the
panel. That has caused two separate bugs; it is not a valid colour for text.

`corrections.md` is the standing QA log — every judgment call, every presentation
question still open against the printed book, and every error found after shipping,
because a post-ship error indicates a pipeline gap and not just a typo.

---

## Project layout

```
src/
  App.jsx            game loop and state
  grading.js         pure: answer grading, round composition  ← tested
  scheduler.js       pure: tray building, mode selection, gating  ← tested
  accent.js          pure: accent slot parsing/application  ← tested
  sheet.js           pure: sheet dismiss gesture maths  ← tested
  useWide.js         the single ≥1024px breakpoint
  db.js              Dexie/IndexedDB persistence, mastery, decay
  theme.js           locked palette and tuning constants
  components/
    TopBar.jsx       breadcrumb + gild rule
    Sheet.jsx        the bottom-sheet container
    TablesPanel.jsx  ─┐ container-agnostic: rendered inside a Sheet on a
    ModesPanel.jsx    │ phone and (Tables) inside the rail on desktop.
    SettingsPanel.jsx─┘ They own content, never position — do not add chrome.
    RoundEnd.jsx     one "what now?" screen for every mode that ends
    ParadigmTable.jsx / Cell.jsx / PromptBanner.jsx / MiniStep.jsx
  content/           one JSON file per unit + refusals.json + modes.json
  *.test.js          vitest suites
scripts/
  validate-content.mjs   content integrity gate
  crosscheck.mjs         external-source verification
  measure-layout.js      browser occlusion check — see Correctness
```

**Stack:** React 19 + Vite 6, Tailwind 4, Dexie (IndexedDB), vite-plugin-pwa. No
runtime morphology: the app is a scheduler and renderer over pre-generated tables.

**Design constants** (`src/theme.js`): gild at mastery 3; speed bonus under 2500 ms;
6 chips per tray; 60 s race; decay at 4 and 10 days; Snipe 70/30 current-to-earlier.

**Visual identity is locked**: night-stele palette, GFS Didot for Greek, Jost for UI,
gold = mastered, Aegean blue = active/correct. All animation respects
`prefers-reduced-motion`.

---

## Known gaps

- **Unit 20 has no tables yet** (verbal adjectives, κεῖμαι, νοῦς, ἄστυ).
- Not yet authored: imperatives, adjectives (2-1-2, third-declension, πᾶς, μέγας,
  ἡδύς, comparison), personal and reflexive pronouns, numerals, ναῦς, μι-verb
  participles, ἵημι's aorist subjunctive/optative.
- **Unit placement is verified** against the book's table of contents, but individual
  model-word choices within a unit are inference in a few places — flagged in
  `corrections.md`.
- The μι-verb tables still want a **second independent human check** against the
  printed book.
- Presentation questions still open with the book: vocatives (currently omitted),
  duals (currently omitted), the macron policy, and whether ἵημι's aorist should keep
  H&Q's compound hyphens.

When a question is ambiguous, resolve it in favour of **correctness of Greek** over
feature count. A paradigm trainer that teaches one wrong form has negative value.
