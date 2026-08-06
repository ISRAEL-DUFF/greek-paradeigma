# UI Rebuild — the board becomes the app

**Status:** ✅ COMPLETE — all phases done 2026-08-06.
**Written:** 2026-08-06
**Supersedes:** the layout described in `README.md` §"How the game works"; nothing in
`paradeigma-build-plan.md` (mechanics M1–M7 are untouched).

---

## 1. Why

Measured at 375 × 812 on the real app, Unit 3:

| Block | Height |
| --- | --- |
| Brand + unit stepper + gilded/accent stats | 100 px |
| Class-on-unit / stay-ahead sprint planner | 42 px |
| Table picker | 304 px |
| Mode chips (7, wrapping to 2 rows) | 68 px |
| **Chrome above the board** | **514 px — 63 % of the viewport** |
| Fixed bottom bar (prompt + tray) | ~256 px |
| **Paradigm visible in its natural position** | **42 px** |

The paradigm is the product. It currently gets 5 % of the screen and can only be
seen by scrolling. At Unit 20 with 122 tables it is worse.

Nothing in the top four blocks is touched per-answer. All of it is priced as if it were.

## 2. The organising principle

Sort every control by **how often it is actually touched**, and give permanent space
only to what is touched per-answer.

| Control | Touched | Destination |
| --- | --- | --- |
| Unit gate | ~weekly | Settings sheet |
| Class-on-unit / stay-ahead | ~once a term | Settings sheet |
| gilded 21/508, accents % | never *touched* — read only | Settings sheet + gild rule |
| Table picker | a few times a session | Tables sheet |
| Mode selection | a few times a session | Modes sheet + round-end |
| Prompt banner + tray | **every answer** | stays (bottom bar) |
| **The paradigm** | constantly | **everything else** |

## 3. Target shell (variant B)

```
┌──────────────────────────────────────┐
│ ☰   UNIT 3 · τέχνη ▾      [ FILL ]   │  48 px  TopBar
├──────────────────────────────────────┤
│ ▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │   2 px  gild rule (this table)
│                                      │
│           THE BOARD                  │  fills
│                                      │
├──────────────────────────────────────┤
│  prompt banner + tray / bank         │  fixed bottom bar (unchanged)
└──────────────────────────────────────┘
```

Chrome: **514 px → 50 px.** Board: **42 px → ~498 px.**

### Decided

- **Gild rule is table-local.** It fills as *this* table approaches gold, so it moves
  while you play. The global `21 / 508` never visibly does; it goes in the sheet.
- **Sheets, not pages.** You choose in relation to what you were just looking at, and
  a page means a navigation stack to lose your place in mid-round.
- **Sheets stay open until dismissed** by swipe-down or scrim tap — *not* dismiss-on-pick.
  Picking a table swaps the board behind the sheet; you can keep browsing.
- **Unit gate is not reachable from the board.** It is global — a mis-tap silently
  changes what the entire app will show. It requires deliberate intent.
- **No auto-hiding bar.** Motion is this app's teaching vocabulary; a bar that animates
  while you drill competes with the prompt banner, which we deliberately made eye-catching.

### The breadcrumb rule

> **The breadcrumb names what is on the board right now.**

Not "the table you picked" — in **Snipe** the scheduler moves you between tables and the
bar must follow or it lies. Consequences:

- **Fill / Impostor / Lookup / Race / Scramble** — `UNIT 3 · τέχνη ▾`
- **Snipe** — follows the jump, re-rendering as the scheduler moves you
- **Twin** — two tables are on the board, so it shows two: `τέχνη ⇄ χώρᾱ ▾`
  - `⇄` carries Twin's meaning (a confusable pair)
  - both names get `min-width: 0` + ellipsis so neither starves the other
  - the `UNIT n` label is **dropped in Twin** — twins can cross units, so it would be
    ambiguous; each table's unit stays visible in the board's own sticky headers
  - budget at 375 px: ~245 px for the breadcrumb region, ~190 px without the unit label.
    `τέχνη ⇄ χώρᾱ` ≈ 140 px fits; `PP παιδεύω ⇄ PP λύω` ≈ 170 px ellipses gracefully

## 4. What is explicitly NOT changing

This is a **presentation-layer** change. Untouched:

- `grading.js`, `scheduler.js`, `accent.js` — all pure logic
- `db.js` — persistence, mastery, decay
- `content/*.json` — all 916 cells
- every mechanic's rules: M1–M7 and Scramble behave identically

**Therefore all 66 existing tests stay valid and green throughout.** Any red test during
this work means a real regression, not an expected churn — treat it as a stop signal.

The one obsolete key: meta `pickerOpen`. Leave it in the DB (harmless); stop reading it.

## 5. Phases

Each phase leaves the app **fully working and shippable**. Do not start the next until
the previous is verified.

### Phase 0 — Extract, no visual change ✅ done 2026-08-06

Extracted to `src/components/`: `TablePicker.jsx`, `PromptBanner.jsx`, `MiniStep.jsx`,
`ParadigmTable.jsx` (with `Row`), `Cell.jsx` (with `CorrectFlash` and `prefixOfForFake`).
`App.jsx` 2005 → 1540 lines. Two imports became dead and were dropped — `ROLE_SHORT` (now
imported by `PromptBanner.jsx`) and `scaffoldOf` (now imported by `Cell.jsx`).

Verified verbatim by sorting and diffing the line multiset of the removed region against
the new files — 446 lines in, 446 lines out, zero differences. Build, `validate`, and all
66 tests green; all 7 modes render; Scramble drag and a Fill answer both exercised in the
browser.


`App.jsx` is ~1900 lines. Doing a layout rewrite inside it is where bugs hide.

- Move `TablePicker`, the header, the sprint planner, the mode chips, `ParadigmTable`,
  `Row`, `Cell`, `PromptBanner`, `MiniStep` into `src/components/*.jsx`, **as-is**
- No markup, style, or behaviour change of any kind
- **Gate:** `npm run check` green; all 7 modes visually identical to before

*Why first:* it makes every later diff readable, and it is the only phase that is
risk-free by construction.

### Phase 1 — Sheet infrastructure ✅ done 2026-08-06

`src/sheet.js` (pure: `sheetOffset`, `dragVelocity`, `shouldDismiss`, thresholds) +
`src/components/Sheet.jsx` + 20 tests in `src/sheet.test.js` — suite now **86**.

Dismiss is distance **or** velocity: past 28 % of the sheet's own height, or a flick at
≥ 0.55 px/ms. Velocity is measured over the last 120 ms only, so a slow drag that ends in a
flick dismisses and a fast drag that ends held does not. Upward over-drag rubber-bands at
1∕3 and caps at 48 px. `SHEET_SLOP` is deliberately the same 6 px as Scramble's `DRAG_SLOP`.

**The drag is bound to the header only, never the body** — a sheet that dismisses when you
try to scroll its contents is the worst way to get this wrong, and the Tables sheet is a
long scrolling list.

Verified in the browser at 375 px: opens to 82 vh flush to the bottom; small drag snaps
back; long drag dismisses; fast short flick dismisses; **body scroll does not dismiss**;
Escape dismisses; scrim tap dismisses; page scroll-lock applied and released. Temporary
mount harness removed afterwards and its absence re-verified.

A reusable `<Sheet>`: scrim, rounded top, grab handle, swipe-down dismiss, scrim-tap
dismiss, Escape, body-scroll lock, `prefers-reduced-motion` respected.

- Gesture maths goes in **`src/sheet.js` as pure functions** — `shouldDismiss({dy, velocity})`,
  `sheetOffset({dy, height})` — so they are unit-testable like `grading.js`
- Pointer Events, not touch handlers. Reuse the hard-won Scramble lessons:
  `setPointerCapture` in try/catch, a movement threshold, and a `pointercancel` handler
- **Gate:** new tests for the gesture maths; sheet opens/dismisses at 375 px

### Phase 2 — TopBar + Tables sheet ✅ done 2026-08-06

**Chrome above the board: 514 px → 50 px, measured.** `App.jsx` 1540 → 1472 lines. Suite 92.

New: `TopBar.jsx` (breadcrumb + gild rule), `TablesPanel.jsx`, `ModesPanel.jsx`,
`SettingsPanel.jsx`, `scripts/measure-layout.js`. `TablePicker.jsx` is superseded and
deleted. `tableWeakness` extracted and exported from `scheduler.js` so the Scramble
scheduler and "weakest first" cannot drift apart; 6 tests cover it.

Phases 3–4 were given their *containers* here rather than a throwaway temporary link —
Modes and Settings hold the existing controls verbatim, and those phases now only enrich
the contents. Cheaper than building scaffolding to be deleted.

Verified at 375 px: all 7 modes pass the occlusion check (`allOk: true`); Twin breadcrumb
renders `Present ⇄ Future` with no unit label and two independent gild segments (100 %/0 %);
Snipe's breadcrumb follows its jump; Tables search, all three filters, the no-match state
and the locked-Unit-4 row all work; 12-cell Scramble still places 12/12, so the drag
auto-scroll survived as §9 predicted.

**Deferred to Phase 5, deliberately:** picking a mode leaves the Modes sheet open (per the
"stays until dismissed" ruling), so you cannot see the round you just started until you
dismiss it. Correct for Tables — you browse — but questionable for Modes. Flagged for a
ruling rather than silently special-cased.

---

<details><summary>Original Phase 2 brief</summary>

The big one.

- Build `TopBar`: ☰ / breadcrumb / mode pill, and the gild rule beneath
- Implement the **breadcrumb rule** including the Twin `⇄` case
- Move `TablePicker` into a sheet; add search, the *By unit / Weakest first / Unfinished*
  filters (weakness scoring already exists in `scheduler.js` — this only exposes it),
  and the **locked-unit row**. **Weakest-first ships in v1.**
- **Decide the responsive contract here** (see Phase 6): panel components take no
  position or chrome of their own; the sheet and the rail are both just containers
- Delete the old header, sprint planner, picker and mode chips from the board flow
  (sprint + modes reappear in phases 3–4; keep them reachable via a temporary link
  so the app is never broken between phases)
- **Re-derive the bottom-bar padding.** The `clamp(11rem, 44vh, 24rem)` was tuned
  against the old layout; measure the bar in every mode and re-derive
- **Gate:** all 7 modes at 375 px — active cell never behind the bar; `npm run check`

**The locked-unit row is a feature, not decoration.** Today, units above the gate simply
do not render, so the gate is invisible. Showing the next unit greyed with a lock turns
it from an invisible restriction into visible runway.

</details>

### Phase 3 — Modes sheet ✅ done 2026-08-06

`src/content/modes.json` + `src/content/modes.js`; `ModesPanel` now renders a **description**
and a **note** per mode. Suite 97; validator reports modes alongside cells.

Two gates, doing different jobs — proven by breaking each on purpose:

- the **validator** enforces per-mode shape: id, name, description ≤ 90 chars, note ≤ 130,
  both ending as sentences. Broke it deliberately → caught both faults.
- a **test reads `App.jsx`** and asserts every mode the game loop can enter has an entry,
  and vice versa. Deleted `twin` from the JSON → validator still passed at "6 modes"
  (it cannot know what App.jsx does) while the test failed with *"modes the app can enter
  but cannot explain"*. That gap is exactly why both exist.

**Bug found and fixed in the browser, not by any test:** notes rendered in `C.line` on
inactive rows — the border colour — so six of the seven were effectively invisible, and the
notes *are* the teaching content. Hierarchy now comes from size and weight (description
`C.marble`, note `C.faint`), never from fading text toward the background.

- Mode metadata — name + one-line description — lives in **content, not code**
  (`src/content/modes.json`), consistent with how `refusals.json` holds curriculum strings
- Validator requires a description for every mode; a test asserts every mode id used by
  `App.jsx` has one
- **Gate:** every mode reachable and described; `npm run check`

*This is a content fix wearing a layout fix's clothes:* `TWIN` and `IMPOSTOR` are opaque
labels on a chip today. A sheet has room for a sentence.

### Phase 4 — Settings & progress sheet ✅ done 2026-08-06

**Layering bug found and fixed.** The unlock overlay was `z-50`; sheets are `z-70`. Bumping
the gate from inside Settings would have announced new tables *behind* the sheet that
opened them. Overlay raised to `z-90`, and `changeUnit` now dismisses the sheet when an
unlock fires — the one case where the app closes a sheet unasked, justified because the
alternative is announcing something invisible.

**Gold decay is now explained**, for the first time anywhere in the app. It is the most
surprising thing the app does and Settings is where you would look. The day counts are
**derived from `DECAY_TO_1_MS`/`DECAY_TO_2_MS`**, not retyped — a hard-coded "4 days"
becomes a lie the moment `db.js` changes.

Verified: gate 3 → 4 closes the sheet, shows the unlock at z-90, and re-gates correctly —
17 → 18 tables, θάλαττα appears, and the locked row advances to Unit 5.

- Unit gate stepper, class-on-unit, stay-ahead, sprint status
- gilded / accents / tables-done, plus the progress meter
- Each control gets a line saying what it actually governs — especially the gate
- **Gate:** changing the unit still re-gates content correctly (existing gating tests cover
  the invariant; confirm the UI path reaches them)

### Phase 5 — Round-end screen ✅ done 2026-08-06

`RoundEnd.jsx` replaces four scattered answers to "what now?" — inline under the table for
Fill, a separate block for Twin, inside the clock row for Race, and on the pinned bar for
Scramble. Suite 101.

**Only four modes get one, and that is the finding.** Snipe re-aims, Lookup and Impostor
auto-advance — they are continuous streams with no end. `ROUND_MODES` and `SAME_TABLE_MODES`
live in `content/modes.js` with tests, so the rule cannot drift: Snipe is never suggested
(cross-table by definition) and Twin is never suggested (needs a pair, not a table).

**`raceBest` is finally visible** — stored in meta since the original Phase 4, never shown
anywhere. The Race suggestion now reads `Race · best 2.8s`.

Three bugs, all found by looking rather than by tests:

1. `roundEnd` checked `scramble.result.solved`; the real property is `allCorrect`. Silently
   never rendered — the bar said "restored" while RoundEnd stayed absent.
2. Once solved, the pinned Scramble bar *and* RoundEnd both announced τάξις, and the bar
   covered the suggestions underneath. The bar now hides when solved: it belongs to playing.
3. "OR TRY THIS TABLE AS" was rendered in `C.line` — the same invisible-label mistake as
   Phase 3. Audited every remaining `color: C.line`; fixed "AFTER SOLVING" too. The rest are
   deliberate (empty-slot dots, the `→` separator).

Modes have left the board, so this screen carries the load.

- Unify the completion states (`Run it again` / `Defend it` / `Next table` / Scramble's
  two flows) into one component
- Add **"or try this table as …"** with the sibling modes
- **Surface `raceBest`** on the Race chip — it has existed in meta since Phase 4 of the
  original build and has never been shown anywhere
- **Gate:** each mode's completion path reaches this screen; Scramble's *Same/Next table*
  flows still work

### Phase 6 — Wide screens ✅ done 2026-08-06

`useWide.js` holds the single 1024px breakpoint. Structural differences (rail vs sheet,
inline vs pinned) cannot be expressed in CSS alone, so the breakpoint exists in JS —
in one place, so the two can never disagree.

**Desktop pins nothing.** All three bars go inline beneath the board and the page reserves
no bottom clearance. Verified across all 7 modes at 1280px: **zero fixed bottom bars**.
The occlusion bug class is not guarded against there — it cannot occur.

**The rail is the same `TablesPanel` the sheet renders**, exactly as the Phase 2 contract
promised; only the container differs. The Tables *sheet* is disabled at ≥1024px so a table
is never pickable in two places at once, and the breadcrumb drops its ▾ and stops being a
button — offering to open what is already open is noise.

**Scramble bank is now two rows everywhere** (`grid-auto-flow: column`, 2 rows,
horizontal scroll). At 375px with 12 tiles: 108px tall, scrolls 915px inside 325px, and
12/12 still place correctly — the drag survived the flex→grid change. Costs ~40px over the
single row and buys back seeing most of the bank at once. On desktop the bar widens to
`max-w-4xl`, since the bank is the one element that genuinely wants the spare axis.

768px correctly stays on the phone layout (no rail, pinned bar); all 7 modes pass the
occlusion check there.

**In scope, not optional** — desktop and mobile are both first-class surfaces.

At ≥ 1024 px horizontal space is the spare axis (the same principle that drove the
Scramble bank sideways), so nothing needs hiding:

- Tables become a permanent left rail; the board centres with a max-width
- Sheets remain the *mobile presentation* of the same components
- **Gate:** 1280 px and 768 px both sane

**Consequence for phasing:** because desktop is first-class, the **responsive contract is
decided in Phase 2, not here.** Every panel component is written container-agnostic from
the start — `<TablePicker>` must not know whether it is inside a sheet or a rail. Phase 6
then only builds the *container*, not a retrofit. Building five phases of sheet-shaped
components and then retrofitting a rail is how this phase would go wrong.

### Phase 7 — Close out ✅ done 2026-08-06

**21 of 21 pass** — 7 modes × {375, 768, 1280}, no horizontal overflow at any width.
`README.md` rewritten (the shell, the three sheets, round end, desktop, the two-row bank,
101 tests, and `measure-layout.js` documented as the fourth gate). Memory updated with the
rules that must not drift. Build, validate, 101 tests, and crosscheck (912/916, unchanged)
all green.

## Outcome

| | before | after |
| --- | --- | --- |
| Chrome above the board (375 px) | 514 px (63 %) | **50 px** |
| Board visible in its natural position | 42 px | **~500 px** |
| `App.jsx` | 2005 lines | ~1500 lines |
| Tests | 66 | **101** |
| Desktop | a stretched phone | rail + inline bar, nothing pinned |

Six bugs surfaced during the rebuild, **none of which any unit test could have caught**:
mode notes rendered in the border colour; the unlock overlay behind the sheet that opened
it; `result.solved` vs `result.allCorrect`; the pinned bar duplicating and covering the
round-end screen; a section label in `C.line`; and the measurement script's own false
negative. Every one came from looking at the running app. That is the standing lesson —
see §7 and `scripts/measure-layout.js`.

- Re-verify all 7 modes × {375, 768, 1280}
- Rewrite `README.md` §layout; update the memory file
- Update `corrections.md` if any content questions surfaced

## 6. Risk register

| Risk | Why it matters | Mitigation |
| --- | --- | --- |
| **Bar-occlusion regressions** | This family has bitten 3× (tray over active cell; bank over drop targets; picker auto-scroll). jsdom has no layout engine, so **the 66 tests cannot catch it** | Explicit per-mode measurement at 375 px at every phase gate. See §7 |
| Sheet gesture vs Scramble drag | Both are pointer-driven | Sheets are never open during a drag; still, share one gesture module and one threshold |
| Snipe breadcrumb churn | Bar text changing mid-round could distract | Breadcrumb updates only between questions, never mid-answer |
| Losing the sense of syllabus | Hiding the picker hides the gate | The locked-unit row (Phase 2) — deliberately more visible than today |
| Big-bang rewrite | ~1900-line file, 7 modes | Phase 0 extraction first; every phase independently shippable; work on a branch |

## 7. The verification question — needs a decision

The occlusion bugs are the only class that has repeatedly escaped. They escape because
they are **layout** bugs and the suite runs in jsdom, which has no layout engine.

Three options:

1. **Manual checklist at each gate** — a written 7-mode × 3-width pass.
   *Free; relies on discipline; this is what we do today and it caught nothing until
   a real device did.*
2. **Playwright smoke test** — for each mode, assert the active cell / drop target is not
   behind the fixed bar, at 3 widths. Runs in CI.
   *Genuinely catches this bug class; adds a dependency and ~1 phase of work.*
3. **A measurement script** — a small script driving the existing dev server, printing
   the geometry table for each mode, run by hand at each gate.
   *Most of the value of (2) at a fraction of the cost; not automated.*

**Recommendation: (3) now, (2) later if the project grows.** The bug is always "element A
is behind element B", which is one `getBoundingClientRect` comparison — worth automating
the *measurement* even if not the *running*.

## 8. Open questions

**Settled 2026-08-06:** weakest-first ships in v1; the wide-screen rail is in scope, which
moves the responsive contract into Phase 2.

### Settled

1. **Desktop drops the pinned bottom bar.** At ≥ 1024 px the prompt banner and tray/bank sit
   **inline beneath the board**. Nothing overlays the board, so the occlusion bug class
   *cannot exist* on desktop — it is designed out, not guarded against.
2. **Gild rule follows the breadcrumb rule** ("what is on the board"):
   - one table → one rule
   - **Twin** → two segments split at the midpoint, one per table, in table order
   - **Snipe** → the table it moved you to, re-rendering on each jump
3. **No keyboard shortcuts.** Desktop input is mouse: click, drag, drop. The tap-only design
   carries over unchanged. `Esc`-to-close and focus handling are still implemented, as
   accessibility hygiene rather than as a feature. Greek text entry stays out of scope.
4. **Sheets everywhere.** Modes and Settings are bottom sheets on every surface; no
   popover/pane divergence on desktop.
5. **Search scope** — table names and English labels only. No Greek-form search (it would
   need a polytonic keyboard to be usable).
6. **Unlock flow** — bumping the gate from Settings dismisses the sheet and presents the
   unlock message on the board.

7. **Scramble bank is two rows on every surface** — see §10. The reclaimed vertical space is
   partly *for* this: it buys back the ability to see the bank at a glance, which the
   single-row strip lost.
8. **Desktop keeps the permanent Tables rail** (option (a)) — see §11. Modes and Settings
   remain sheets everywhere.
9. **Verification: the measurement script** (§7 option 3). Adopted as the default, since it
   governs how the work is checked rather than what gets built. Settling desktop's inline bar
   shrinks its job — occlusion is now structurally impossible at ≥ 1024 px, so the script
   only has to cover the mobile layout.

**All design questions are now settled.** Nothing in §§10–11 remains open.

## 9. Scrolling — keep the page scrolling, do not make the board a container

An earlier draft of this plan had the board becoming its own scroll region (fixed top bar
+ fixed bottom bar). **Rejected.** That would break the Scramble drag auto-scroll shipped
2026-08-06, which calls `window.scrollBy` and measures against `window.innerHeight`, and
without it tall tables become undroppable again — the exact bug that made 12-cell
participle tables unplayable.

Instead: **sticky top bar, fixed bottom bar, page scrolls, bottom padding reserves space** —
which is what the app already does. The working auto-scroll survives untouched.

On desktop the question disappears entirely: nothing is pinned, so the page just scrolls.

Still re-run the 12-cell Scramble check at the Phase 2 gate, because the bottom padding is
being re-derived.

## 10. Scramble bank — two rows, every surface

A **two-row grid, filled column-major, scrolling horizontally** when there are more tiles
than fit: `grid-auto-flow: column`, `grid-template-rows: repeat(2, auto)`, `overflow-x: auto`.

Two rows **everywhere**, mobile included. The ~50 px it costs on a phone is spent
deliberately: reclaiming vertical space was partly *in order to* afford this. The single-row
strip solved the height problem but introduced a new one — only ~3 of 12 forms visible at
once — and two rows buys that back while keeping the sideways-scroll win.

Carry forward from the single-row build, unchanged:

- bank tiles keep `touch-action: pan-x` so a sideways swipe scrolls and an upward lift drags
- the 6 px `DRAG_SLOP` before a tile is picked up
- the `pointercancel` handler
- `justify-content: safe center`, so an overflowing bank's start stays reachable

## 11. Desktop keeps the Tables rail

At ≥ 1024 px, Tables is a **permanent left rail**; Modes and Settings are sheets, as on every
other surface.

The rail and the sheet render the *same* container-agnostic component (§Phase 2), so the rail
costs little beyond its container — and it is the difference between a real desktop view and
a phone app stretched wide. It also puts the whole syllabus permanently in view, which is the
strongest possible answer to the "hiding the picker hides the gate" risk in §6.
