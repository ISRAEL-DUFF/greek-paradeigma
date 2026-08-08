import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { C, GOLD_AT, FAST_MS, MAX_UNIT } from "./theme.js";
import {
  unlockedParadigms,
  unlockedCells,
  paradigmsIntroducedAt,
  MAX_SHIPPED_UNIT,
  unitTitle,
  cellKey,
} from "./content/index.js";
import {
  applyDecay,
  loadMastery,
  loadStudied,
  markStudied,
  recordAnswer,
  recordAccent,
  getMeta,
  setMeta,
} from "./db.js";
import {
  shuffle,
  buildTray,
  buildAssemblyTray,
  pickSnipe,
  pickImpostor,
  pickLookup,
  pickTwins,
  pickScrambleTable,
  answerOf,
  isPP,
  drillsWholeForm,
} from "./scheduler.js";
import {
  parseAccentSlots,
  assembleAccented,
  applyAccent,
  ACCENT_CYCLE,
} from "./accent.js";
import {
  gradeAssemblyTap,
  askLevelFor,
  roundBlanks,
  scrambleTiles,
  moveTile,
  gradeScramble,
} from "./grading.js";
import TopBar from "./components/TopBar.jsx";
import Sheet from "./components/Sheet.jsx";
import TablesPanel from "./components/TablesPanel.jsx";
import ModesPanel from "./components/ModesPanel.jsx";
import SettingsPanel from "./components/SettingsPanel.jsx";
import PromptBanner from "./components/PromptBanner.jsx";
import ParadigmTable from "./components/ParadigmTable.jsx";
import RoundEnd from "./components/RoundEnd.jsx";
import useWide from "./useWide.js";

const CASE_NAMES = {
  Nom: "nominative",
  Gen: "genitive",
  Dat: "dative",
  Acc: "accusative",
  Voc: "vocative",
  /* Participles: H&Q §66 obs. 2 — the vocative is always the nominative, so
     the book prints one "Nom./Voc." row and so do we. */
  "Nom/Voc": "nominative/vocative",
};

const PART_DESC = {
  I: "present",
  II: "future",
  III: "aorist active",
  IV: "perfect active",
  V: "perfect middle/passive",
  VI: "aorist passive",
};

/* Extra time allowed per additional piece before the ταχύς bonus lapses. */
const ASSEMBLY_MS_PER_PIECE = 1000;
/* M7: the row race clock. Pure chant-memory training under pressure. */
const RACE_MS = 60000;
/* Scramble: time allowed per cell before the ταχύς bonus lapses. */
const SCRAMBLE_MS_PER_CELL = 3000;

function labelFor(paradigm, cell) {
  const row = paradigm.layout.rowLabels[cell.r];
  const col = paradigm.layout.colLabels[cell.c];
  if (isPP(paradigm)) return `principal part ${row} — ${PART_DESC[row] ?? ""}`;
  /* The infinitive grid is tense × voice, not person × number. */
  if (paradigm.id.includes(".inf")) return `${row.toLowerCase()} ${col} infinitive`;
  if (paradigm.kind === "verb") return `${row} person ${col}`;
  return `${CASE_NAMES[row] ?? row.toLowerCase()} ${col}`;
}

export default function App() {
  /* ---------- persisted state, loaded at boot ---------- */
  const [ready, setReady] = useState(false);
  const [masteryMap, setMasteryMap] = useState({});
  const [studied, setStudied] = useState({});
  const [currentUnit, setCurrentUnit] = useState(1);

  /* ---------- session state ---------- */
  const [paradigmId, setParadigmId] = useState(null);
  const [mode, setMode] = useState("fill"); // fill | snipe | impostor | lookup | twin
  const [phase, setPhase] = useState("study"); // study | decaying | drill | done
  const [active, setActive] = useState(null); // {pid, cid}
  const [tray, setTray] = useState([]); // [{id, text, role?, refusal?}]
  const [assembly, setAssembly] = useState(null); // {expected, progress}
  const [refusal, setRefusal] = useState(null); // {chipId, msg}
  const [lookup, setLookup] = useState(null); // {form, required, found: []}
  const [feedback, setFeedback] = useState({}); // cellKey -> correct | wrong | reveal
  const [snipeTarget, setSnipeTarget] = useState(null); // {pid, cid}
  const [impostor, setImpostor] = useState(null); // {cid, fakeEnd}
  const [impostorMsg, setImpostorMsg] = useState(null);
  const [twinIds, setTwinIds] = useState(null); // [pidA, pidB]
  const [accentStage, setAccentStage] = useState(null); // {pid, cid, key, form, segments, choices, result}
  const [race, setRace] = useState(null); // {startAt, deadline, now, finished, timeMs, bestMs, isRecord}
  const [scramble, setScramble] = useState(null); // {bank, placed, startAt, result}
  const [scrambleFlow, setScrambleFlow] = useState("same"); // "same" | "next", remembered
  const [scrambleSolved, setScrambleSolved] = useState(0); // tables restored this session
  const [drag, setDrag] = useState(null); // {tile, from, x, y}
  const dragRef = useRef(null);
  const dragYRef = useRef(0);
  const scrambleBarRef = useRef(null);
  const DRAG_SLOP = 6; // px of travel before a touch is a drag and not a swipe
  const [syllabus, setSyllabus] = useState(null); // {classUnit, lead}
  const [streak, setStreak] = useState(0);
  const [fastFlash, setFastFlash] = useState(false);
  const [toast, setToast] = useState(null);
  const [unlock, setUnlock] = useState(null);
  /* which sheet is up: "tables" | "modes" | "settings" | null. Deliberately
     NOT persisted — a sheet is a momentary detour, not a place you live. */
  const [sheet, setSheet] = useState(null);
  const [raceBests, setRaceBests] = useState({}); // paradigmId -> ms, for RoundEnd
  const wide = useWide(); // ≥1024px: rail instead of sheet, inline instead of pinned
  const activatedAt = useRef(null);
  const timers = useRef([]);
  const later = (fn, ms) => timers.current.push(setTimeout(fn, ms));

  useEffect(() => {
    (async () => {
      await applyDecay();
      const [m, s, unit, syl, sFlow, bests] = await Promise.all([
        loadMastery(),
        loadStudied(),
        getMeta("currentUnit", 1),
        getMeta("syllabus", null),
        getMeta("scrambleFlow", "same"),
        getMeta("raceBest", {}),
      ]);
      setRaceBests(bests);
      setScrambleFlow(sFlow);
      setMasteryMap(m);
      setStudied(s);
      setCurrentUnit(unit);
      setSyllabus(syl);
      const first = unlockedParadigms(unit)[0];
      setParadigmId(first?.id ?? null);
      setPhase(s[first?.id] ? "drill" : "study");
      setReady(true);
    })();
    return () => timers.current.forEach(clearTimeout);
  }, []);

  const paradigms = useMemo(() => unlockedParadigms(currentUnit), [currentUnit]);
  const paradigm = paradigms.find((p) => p.id === paradigmId) ?? paradigms[0];
  const shownParadigms = useMemo(() => {
    if (mode === "twin" && twinIds) {
      const pair = twinIds.map((id) => paradigms.find((p) => p.id === id)).filter(Boolean);
      if (pair.length === 2) return pair;
    }
    return paradigm ? [paradigm] : [];
  }, [mode, twinIds, paradigm, paradigms]);

  const recOf = (pid, cid) => masteryMap[cellKey(pid, cid)];
  const getM = (pid, cid) => recOf(pid, cid)?.level ?? 0;

  const { totalGold, totalCells, accentPct } = useMemo(() => {
    const cells = unlockedCells(currentUnit);
    let att = 0;
    let ok = 0;
    for (const r of Object.values(masteryMap)) {
      att += r.accentAttempts || 0;
      ok += r.accentCorrect || 0;
    }
    return {
      totalCells: cells.length,
      totalGold: cells.filter(
        ({ paradigm: p, cell: c }) => getM(p.id, c.id) >= GOLD_AT
      ).length,
      accentPct: att > 0 ? Math.round((100 * ok) / att) : null,
    };
  }, [currentUnit, masteryMap]);

  /* ---------- which cells are blank this round (keys) ---------- */
  const blanks = useMemo(() => {
    if (!paradigm) return new Set();
    if (mode === "fill") {
      if (phase === "study" || phase === "decaying") return new Set();
      const gated = paradigm.cells.filter((c) => c.unitMax <= currentUnit);
      const { cells } = roundBlanks({
        cells: gated,
        levelOf: (c) => getM(paradigm.id, c.id),
      });
      return new Set(cells.map((c) => cellKey(paradigm.id, c.id)));
    }
    if (mode === "twin" && twinIds) {
      const gated = shownParadigms.flatMap((p) =>
        p.cells.filter((c) => c.unitMax <= currentUnit).map((c) => ({ p, c }))
      );
      const { cells } = roundBlanks({
        cells: gated,
        levelOf: ({ p, c }) => getM(p.id, c.id),
      });
      return new Set(cells.map(({ p, c }) => cellKey(p.id, c.id)));
    }
    if (mode === "snipe")
      return new Set(snipeTarget ? [cellKey(snipeTarget.pid, snipeTarget.cid)] : []);
    if (mode === "race")
      // the race blanks EVERYTHING, gold included — pure chant under the clock
      return new Set(
        paradigm.cells
          .filter((c) => c.unitMax <= currentUnit)
          .map((c) => cellKey(paradigm.id, c.id))
      );
    return new Set(); // impostor & lookup: handled by their own render paths
  }, [mode, phase, paradigm, shownParadigms, twinIds, masteryMap, snipeTarget, currentUnit]);

  /* Unanswered blanks, in drill order (twin interleaves its two tables). */
  const unanswered = useMemo(() => {
    const list = (p) =>
      p.cells
        .filter(
          (c) =>
            blanks.has(cellKey(p.id, c.id)) &&
            feedback[cellKey(p.id, c.id)] !== "correct"
        )
        .map((c) => ({ pid: p.id, cid: c.id }));
    if (mode === "twin" && shownParadigms.length === 2) {
      const [a, b] = shownParadigms.map(list);
      const out = [];
      for (let i = 0; i < Math.max(a.length, b.length); i++) {
        if (a[i]) out.push(a[i]);
        if (b[i]) out.push(b[i]);
      }
      return out;
    }
    if (mode === "race" && paradigm) {
      // column-major: chant down the singular column, then down the plural
      return [...paradigm.cells]
        .sort((a, b) => a.c - b.c || a.r - b.r)
        .filter(
          (c) =>
            blanks.has(cellKey(paradigm.id, c.id)) &&
            feedback[cellKey(paradigm.id, c.id)] !== "correct"
        )
        .map((c) => ({ pid: paradigm.id, cid: c.id }));
    }
    return paradigm ? list(paradigm) : [];
  }, [blanks, feedback, mode, shownParadigms, paradigm]);

  const paradigmOf = (pid) => shownParadigms.find((p) => p.id === pid) ?? paradigm;

  /* Deferred re-asks (the 1.9 s recovery after a miss, the Snipe hand-off) fire
     from timers created in an earlier render. Reading mastery through a ref
     keeps them honest: a cell demoted by that very miss must be re-asked at its
     NEW level, and the tray must know the confusion it just recorded. */
  const masteryRef = useRef(masteryMap);
  useEffect(() => {
    masteryRef.current = masteryMap;
  }, [masteryMap]);

  /* ---------- selecting a cell builds its tray (Level 1 or assembly) ---------- */
  const selectCell = useCallback(
    (p, cid) => {
      setActive({ pid: p.id, cid });
      setRefusal(null);
      activatedAt.current = Date.now();
      const cell = p.cells.find((c) => c.id === cid);
      const rec = masteryRef.current[cellKey(p.id, cid)];
      const level = rec?.level ?? 0;
      const pieces = cell.pieces.filter((pc) => pc.text !== "");
      if (askLevelFor({ level, pieceCount: pieces.length, mode }) === 2) {
        const a = buildAssemblyTray({ paradigm: p, cell, currentUnit });
        setAssembly({ expected: a.expected, progress: 0 });
        setTray(a.chips);
      } else {
        setAssembly(null);
        setTray(
          buildTray({ paradigm: p, cell, currentUnit, masteryRecord: rec }).map(
            (text, i) => ({ id: `c${i}`, text })
          )
        );
      }
      requestAnimationFrame(() =>
        document
          .getElementById(`cell-${p.id}-${cid}`)
          ?.scrollIntoView({ block: "center", behavior: "smooth" })
      );
    },
    [currentUnit, mode]
  );

  /* ---------- round setup ---------- */
  const clearRound = () => {
    setFeedback({});
    setActive(null);
    setTray([]);
    setAssembly(null);
    setRefusal(null);
    setLookup(null);
    setSnipeTarget(null);
    setImpostor(null);
    setImpostorMsg(null);
    setAccentStage(null);
    setRace(null);
    setScramble(null);
    setDrag(null);
    dragRef.current = null;
  };

  const nextSnipe = useCallback(() => {
    const target = pickSnipe(currentUnit, masteryMap);
    if (!target) return;
    setFeedback({});
    setParadigmId(target.paradigm.id);
    setSnipeTarget({ pid: target.paradigm.id, cid: target.cell.id });
    later(() => selectCell(target.paradigm, target.cell.id), 0);
  }, [currentUnit, masteryMap, selectCell]);

  const nextImpostor = useCallback(
    (p = paradigm) => {
      setFeedback({});
      const imp = pickImpostor(p, currentUnit);
      setImpostor(imp);
      setImpostorMsg(
        imp ? "One form in this table is wrong. Tap it." : "This table is too small to fake."
      );
    },
    [paradigm, currentUnit]
  );

  const nextLookup = useCallback(
    (p = paradigm) => {
      setFeedback({});
      const l = pickLookup(p, currentUnit, masteryMap);
      setLookup({ ...l, found: [] });
      activatedAt.current = Date.now();
    },
    [paradigm, currentUnit, masteryMap]
  );

  const startRound = (nextMode, p = paradigm) => {
    clearRound();
    if (nextMode === "twin") {
      const pair = pickTwins(currentUnit, masteryMap);
      if (!pair) {
        setMode("fill");
        setPhase(studied[p.id] ? "drill" : "study");
        return;
      }
      setTwinIds([pair[0].id, pair[1].id]);
      setPhase("drill");
    } else if (nextMode === "fill") {
      setPhase(studied[p.id] ? "drill" : "study");
    } else if (nextMode === "snipe") {
      setPhase("drill");
      nextSnipe();
    } else if (nextMode === "lookup") {
      setPhase("drill");
      nextLookup(p);
    } else if (nextMode === "scramble") {
      setPhase("drill");
      const cells = p.cells.filter((c) => c.unitMax <= currentUnit);
      setScramble({
        bank: scrambleTiles(cells, shuffle),
        placed: {},
        startAt: Date.now(),
        result: null,
      });
    } else if (nextMode === "race") {
      setPhase("drill");
      (async () => {
        const bests = await getMeta("raceBest", {});
        const startAt = Date.now();
        setRace({
          startAt,
          deadline: startAt + RACE_MS,
          now: startAt,
          finished: null,
          timeMs: null,
          bestMs: bests[p.id] ?? null,
          isRecord: false,
        });
      })();
    } else {
      setPhase("drill");
      nextImpostor(p);
    }
  };

  const changeMode = (m) => {
    setMode(m);
    if (m === "scramble") setScrambleSolved(0); // a fresh session's tally
    startRound(m);
  };
  const changeParadigm = (pid) => {
    const p = paradigms.find((x) => x.id === pid);
    setParadigmId(pid);
    if (mode === "twin") {
      setMode("fill");
      setTwinIds(null);
      startRound("fill", p);
    } else {
      startRound(mode, p);
    }
  };

  const changeUnit = async (next) => {
    const unit = Math.max(1, Math.min(MAX_UNIT, next));
    if (unit === currentUnit) return;
    setCurrentUnit(unit);
    await setMeta("currentUnit", unit);
    if (unit > currentUnit) {
      const fresh = paradigmsIntroducedAt(unit);
      if (fresh.length) {
        /* The gate is normally bumped from inside the Settings sheet. An
           unlock is an announcement about the BOARD, so the sheet gets out of
           the way — it is the one thing allowed to dismiss a sheet without
           the user asking, and only because the alternative is announcing
           something they cannot see. */
        setSheet(null);
        setUnlock({ unit, paradigms: fresh });
      }
    }
    const stillVisible = unlockedParadigms(unit).some((p) => p.id === paradigmId);
    const p = stillVisible
      ? unlockedParadigms(unit).find((p) => p.id === paradigmId)
      : unlockedParadigms(unit)[0];
    setParadigmId(p.id);
    const fallbackMode =
      mode === "snipe" || mode === "twin" || mode === "race" ? "fill" : mode;
    startRound(fallbackMode, p);
    if (fallbackMode !== mode) setMode(fallbackMode);
  };

  const saveSyllabus = async (s) => {
    setSyllabus(s);
    await setMeta("syllabus", s);
  };

  const setFlow = async (f) => {
    setScrambleFlow(f);
    await setMeta("scrambleFlow", f);
  };

  /* Hand the session a different table — same rules Snipe schedules by, but
     scored over whole tables, and never the one just finished. */
  const nextScrambleTable = () => {
    const next = pickScrambleTable(currentUnit, masteryRef.current, paradigm.id);
    const p = next ?? paradigm;
    setParadigmId(p.id);
    startRound("scramble", p);
  };


  /* ---------- auto-advance to the next blank ---------- */
  useEffect(() => {
    if (!ready || phase !== "drill") return;
    if (mode === "impostor" || mode === "lookup" || mode === "scramble") return;
    if (mode === "race" && (!race || race.finished)) return;
    if (accentStage) return; // finish the accents first
    if (
      active &&
      blanks.has(cellKey(active.pid, active.cid)) &&
      feedback[cellKey(active.pid, active.cid)] !== "correct"
    )
      return;
    const next = unanswered[0];
    if (next) selectCell(paradigmOf(next.pid), next.cid);
    else if (mode === "fill" || mode === "twin") {
      setPhase("done");
      setActive(null);
      setTray([]);
      setAssembly(null);
    }
  }, [ready, phase, blanks, feedback, mode, accentStage, race]); // eslint-disable-line

  /* ---------- M7 race clock ---------- */
  useEffect(() => {
    if (mode !== "race" || !race || race.finished) return;
    const iv = setInterval(() => {
      setRace((r) => {
        if (!r || r.finished) return r;
        if (Date.now() >= r.deadline) return { ...r, finished: "timeout" };
        return { ...r, now: Date.now() };
      });
    }, 200);
    return () => clearInterval(iv);
  }, [mode, race?.finished, race != null]); // eslint-disable-line

  useEffect(() => {
    if (race?.finished === "timeout") {
      setActive(null);
      setTray([]);
    }
  }, [race?.finished]);

  /* race completion: every cell chanted before the clock */
  useEffect(() => {
    if (mode !== "race" || !race || race.finished || phase !== "drill") return;
    if (unanswered.length > 0 || Object.keys(feedback).length === 0) return;
    const timeMs = Date.now() - race.startAt;
    setActive(null);
    setTray([]);
    (async () => {
      const bests = await getMeta("raceBest", {});
      const prev = bests[paradigm.id] ?? null;
      const isRecord = !prev || timeMs < prev;
      const best = isRecord ? timeMs : prev;
      const nextBests = { ...bests, [paradigm.id]: best };
      await setMeta("raceBest", nextBests);
      setRaceBests(nextBests);
      setRace((r) => (r ? { ...r, finished: "done", timeMs, bestMs: best, isRecord } : r));
    })();
  }, [mode, race, unanswered, feedback, phase]); // eslint-disable-line

  /* ---------- Scramble: pointer-event drag and drop ----------
     Built on pointer events rather than HTML5 drag-and-drop, which does
     nothing on touch — this gives real dragging on the phone too. */
  const beginDrag = (e, tile, from) => {
    if (!scramble || e.button > 0) return;
    // capture keeps move/up coming to this element once the finger leaves it;
    // it throws if the pointer is not active, which must not abort the drag
    try {
      e.currentTarget.setPointerCapture?.(e.pointerId);
    } catch {}
    // armed, not yet lifted — see moveDrag
    dragRef.current = { tile, from, x0: e.clientX, y0: e.clientY, live: false };
  };

  /* A tile is not picked up until the pointer has actually travelled. The bank
     scrolls sideways, so a horizontal swipe is a scroll, not a grab: without
     this threshold the ghost would flash on every swipe and every tap. */
  const moveDrag = (e) => {
    const d = dragRef.current;
    if (!d) return;
    dragYRef.current = e.clientY;
    if (!d.live) {
      if (Math.hypot(e.clientX - d.x0, e.clientY - d.y0) < DRAG_SLOP) return;
      d.live = true;
    }
    e.preventDefault();
    setDrag({ tile: d.tile, from: d.from, x: e.clientX, y: e.clientY });
  };

  /* The browser fires pointercancel when it takes the gesture over to pan the
     bank — that is the normal end of a sideways swipe, not an error. */
  const cancelDrag = () => {
    dragRef.current = null;
    setDrag(null);
  };

  const endDrag = (e) => {
    const d = dragRef.current;
    dragRef.current = null;
    setDrag(null);
    if (!d || !scramble) return;
    try {
      e.currentTarget.releasePointerCapture?.(e.pointerId);
    } catch {}

    // the ghost is pointer-events:none, so this hits what is underneath
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const zone = el?.closest("[data-drop]")?.getAttribute("data-drop");
    if (!zone) return; // dropped nowhere: leave it where it was

    const to = zone === "bank" ? { type: "bank" } : { type: "cell", cellId: zone.slice(5) };
    if (d.from.type === to.type && d.from.cellId === to.cellId) return;

    const next = moveTile({
      placed: scramble.placed,
      bank: scramble.bank,
      tile: d.tile,
      from: d.from,
      to,
    });
    // moving anything invalidates the last verdict, so the board goes live again
    setScramble((s) => (s ? { ...s, ...next, result: null } : s));
  };

  /* The bank is pinned to the bottom, so the lower rows of a tall table sit
     behind it — and you cannot scroll with a finger already down. Auto-scroll
     while dragging: near the top of the viewport, and in the band just above
     the bar, which is what makes 12-cell tables reachable at all. */
  useEffect(() => {
    if (!drag) return;
    let raf;
    const tick = () => {
      const y = dragYRef.current;
      const barTop = scrambleBarRef.current?.getBoundingClientRect().top ?? window.innerHeight;
      const EDGE = 90;
      if (y < EDGE) window.scrollBy(0, -14);
      else if (y > barTop - EDGE && y < barTop + 8) window.scrollBy(0, 14);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [!!drag]);

  const checkScramble = async () => {
    if (!scramble) return;
    const p = paradigm;
    const cells = p.cells.filter((c) => c.unitMax <= currentUnit);
    const r = gradeScramble({ cells, placed: scramble.placed });
    if (!r.complete) return; // the button is disabled anyway

    const elapsed = Date.now() - scramble.startAt;
    if (r.allCorrect) {
      const budget = FAST_MS + SCRAMBLE_MS_PER_CELL * (cells.length - 1);
      const fast = elapsed < budget;
      setStreak((s) => s + 1);
      setScrambleSolved((n) => n + 1);
      if (fast) {
        setFastFlash(true);
        later(() => setFastFlash(false), 900);
      }
      for (const c of cells)
        await commitAnswer({ p, cell: c, correct: true, fast, latencyMs: elapsed });
    } else {
      // only the misplaced cells are penalised, so guess-and-check costs you
      setStreak(0);
      for (const id of r.wrongCells) {
        const cell = cells.find((c) => c.id === id);
        await commitAnswer({
          p,
          cell,
          correct: false,
          fast: false,
          latencyMs: elapsed,
          wrongChip: scramble.placed[id]?.form,
        });
      }
    }
    setScramble((s) => (s ? { ...s, result: r } : s));
  };

  /* ---------- shared answer bookkeeping ---------- */
  const commitAnswer = async ({ p, cell, correct, fast, latencyMs, wrongChip }) => {
    const key = cellKey(p.id, cell.id);
    const prev = getM(p.id, cell.id);
    const rec = await recordAnswer({ key, correct, fast, latencyMs, wrongChip });
    setMasteryMap((m) => ({ ...m, [key]: rec }));
    if (correct && prev < GOLD_AT && rec.level >= GOLD_AT && cell.unlockMsg) {
      setToast(cell.unlockMsg);
      later(() => setToast(null), 4000);
    }
    return rec;
  };

  const continueAfterAnswer = useCallback(() => {
    if (mode === "snipe") later(nextSnipe, 1100);
  }, [mode, nextSnipe]);

  const openAccentStage = (p, cell) => {
    const segments = parseAccentSlots(cell.form);
    if (segments.filter((s) => s.isSlot).length === 0) {
      continueAfterAnswer();
      return;
    }
    setAccentStage({
      pid: p.id,
      cid: cell.id,
      key: cellKey(p.id, cell.id),
      form: cell.form,
      segments,
      choices: segments.filter((s) => s.isSlot).map(() => "none"),
      result: null,
    });
  };

  const succeed = (p, cell, fast, wasAssembly) => {
    setFeedback((f) => ({ ...f, [cellKey(p.id, cell.id)]: "correct" }));
    setStreak((s) => s + 1);
    if (fast) {
      setFastFlash(true);
      later(() => setFastFlash(false), 900);
    }
    setTray([]);
    setAssembly(null);
    // M5: a correct Level-2 assembly earns the accent finishing move
    if (wasAssembly && !drillsWholeForm(p)) openAccentStage(p, cell);
    else continueAfterAnswer();
  };

  const fail = (p, cell) => {
    const key = cellKey(p.id, cell.id);
    setFeedback((f) => ({ ...f, [key]: "wrong" }));
    setStreak(0);
    later(() => {
      setFeedback((f) => ({ ...f, [key]: "reveal" }));
      later(() => {
        setFeedback((f) => {
          const n = { ...f };
          delete n[key];
          return n;
        });
        selectCell(p, cell.id);
      }, 1400);
    }, 500);
  };

  /* ---------- answering with a chip ---------- */
  const tapChip = async (chip) => {
    if (!active) return;
    const p = paradigmOf(active.pid);
    const cell = p.cells.find((c) => c.id === active.cid);
    const elapsed = Date.now() - (activatedAt.current || Date.now());

    // M7: the race never touches mastery — pure chant against the clock
    if (mode === "race") {
      if (race?.finished) return;
      const key = cellKey(p.id, cell.id);
      if (chip.text === answerOf(p, cell)) {
        setFeedback((f) => ({ ...f, [key]: "correct" }));
        setTray([]);
      } else {
        setFeedback((f) => ({ ...f, [key]: "wrong" }));
        later(() => {
          setFeedback((f) => {
            const n = { ...f };
            delete n[key];
            return n;
          });
          selectCell(p, cell.id); // no reveal — time is the only penalty
        }, 450);
      }
      return;
    }

    if (assembly) {
      const { verdict, message } = gradeAssemblyTap({
        expected: assembly.expected,
        progress: assembly.progress,
        chip,
      });

      // Refusals and ordering slips teach; neither costs a mastery level.
      if (verdict === "refuse" || verdict === "outOfOrder") {
        setRefusal({ chipId: chip.id, msg: message });
        later(() => setRefusal(null), 1600);
        return;
      }
      if (verdict === "advance") {
        setAssembly({ ...assembly, progress: assembly.progress + 1 });
        setTray((t) => t.filter((c) => c.id !== chip.id));
        return;
      }
      if (verdict === "complete") {
        const budget = FAST_MS + ASSEMBLY_MS_PER_PIECE * (assembly.expected.length - 1);
        const fast = elapsed < budget;
        succeed(p, cell, fast, true);
        await commitAnswer({ p, cell, correct: true, fast, latencyMs: elapsed });
        return;
      }
      // "wrong": a piece that belongs to no part of this form
      fail(p, cell);
      await commitAnswer({
        p,
        cell,
        correct: false,
        fast: false,
        latencyMs: elapsed,
        wrongChip: chip.text,
      });
      return;
    }

    const correctAnswer = answerOf(p, cell);
    if (chip.text === correctAnswer) {
      const fast = elapsed < FAST_MS;
      succeed(p, cell, fast, false);
      await commitAnswer({ p, cell, correct: true, fast, latencyMs: elapsed });
    } else {
      fail(p, cell);
      await commitAnswer({
        p,
        cell,
        correct: false,
        fast: false,
        latencyMs: elapsed,
        wrongChip: chip.text,
      });
    }
  };

  /* ---------- M5 accent stage ---------- */
  const cycleAccent = (slotIdx) => {
    if (!accentStage || accentStage.result) return;
    setAccentStage((s) => {
      const choices = [...s.choices];
      const cur = ACCENT_CYCLE.indexOf(choices[slotIdx]);
      choices[slotIdx] = ACCENT_CYCLE[(cur + 1) % ACCENT_CYCLE.length];
      return { ...s, choices };
    });
  };

  const confirmAccent = async () => {
    if (!accentStage || accentStage.result) return;
    const built = assembleAccented(accentStage.segments, accentStage.choices);
    const ok = built === accentStage.form.normalize("NFC");
    const rec = await recordAccent(accentStage.key, ok);
    if (rec) setMasteryMap((m) => ({ ...m, [accentStage.key]: rec }));
    setAccentStage((s) => ({ ...s, result: ok ? "correct" : "wrong" }));
    later(() => {
      setAccentStage(null);
      continueAfterAnswer();
    }, 1600);
  };

  const skipAccent = () => {
    if (!accentStage) return;
    setAccentStage(null);
    continueAfterAnswer();
  };

  /* ---------- impostor tap ---------- */
  const tapImpostorCell = async (cid) => {
    if (!impostor) return;
    const cell = paradigm.cells.find((c) => c.id === cid);
    const key = cellKey(paradigm.id, cid);
    if (cid === impostor.cid) {
      setFeedback({ [key]: "correct" });
      setStreak((s) => s + 1);
      setImpostorMsg("Found it — watch it correct itself.");
      const elapsed = Date.now() - (activatedAt.current || Date.now());
      await commitAnswer({ p: paradigm, cell, correct: true, fast: false, latencyMs: elapsed });
      later(() => nextImpostor(), 1600);
    } else {
      setFeedback((f) => ({ ...f, [key]: "wrong" }));
      setStreak(0);
      setImpostorMsg("That one is genuine. Look again.");
      later(
        () =>
          setFeedback((f) => {
            const n = { ...f };
            delete n[key];
            return n;
          }),
        600
      );
    }
  };

  /* ---------- lookup tap (M3) ---------- */
  const tapLookupCell = async (cid) => {
    if (!lookup || lookup.found.includes(cid)) return;
    const cell = paradigm.cells.find((c) => c.id === cid);
    const key = cellKey(paradigm.id, cid);
    if (lookup.required.includes(cid)) {
      const found = [...lookup.found, cid];
      setFeedback((f) => ({ ...f, [key]: "correct" }));
      if (found.length >= lookup.required.length) {
        const elapsed = Date.now() - (activatedAt.current || Date.now());
        const fast = elapsed < FAST_MS * lookup.required.length;
        setStreak((s) => s + 1);
        if (fast) {
          setFastFlash(true);
          later(() => setFastFlash(false), 900);
        }
        for (const rid of lookup.required) {
          const rcell = paradigm.cells.find((c) => c.id === rid);
          await commitAnswer({ p: paradigm, cell: rcell, correct: true, fast, latencyMs: elapsed });
        }
        setLookup({ ...lookup, found });
        later(() => nextLookup(), 1400);
      } else {
        setLookup({ ...lookup, found });
      }
    } else {
      setFeedback((f) => ({ ...f, [key]: "wrong" }));
      setStreak(0);
      const target = paradigm.cells.find((c) => c.id === lookup.required[0]);
      const elapsed = Date.now() - (activatedAt.current || Date.now());
      await commitAnswer({
        p: paradigm,
        cell: target,
        correct: false,
        fast: false,
        latencyMs: elapsed,
        wrongChip: `@${cid}`,
      });
      later(
        () =>
          setFeedback((f) => {
            const n = { ...f };
            delete n[key];
            return n;
          }),
        600
      );
    }
  };

  const beginDecay = async () => {
    setStudied((s) => ({ ...s, [paradigm.id]: true }));
    await markStudied(paradigm.id);
    setPhase("decaying");
    later(() => setPhase("drill"), 1000);
  };

  if (!ready || !paradigm) {
    return (
      <div
        className="min-h-screen flex items-center justify-center gk text-2xl"
        style={{ background: C.ink, color: C.faint }}
      >
        παράδειγμα
      </div>
    );
  }

  /* Gold is always counted over GATED cells — a mixed-gate table (the
     infinitive grid spans U2..U16) must read complete when everything the
     player can currently reach is gold, not when Unit 16 arrives. */
  const gatedOf = (p) => p.cells.filter((c) => c.unitMax <= currentUnit);
  const goldCount = gatedOf(paradigm).filter((c) => getM(paradigm.id, c.id) >= GOLD_AT).length;
  const assemblyPrefix = assembly
    ? assembly.expected.slice(0, assembly.progress).map((pc) => pc.text).join("")
    : null;
  const twinMode = mode === "twin" && shownParadigms.length === 2;

  /* The breadcrumb and the gild rule both name WHAT IS ON THE BOARD — so they
     read off shownParadigms, not the table last picked. That is what makes
     Snipe's jumps and Twin's pair come out right without special-casing. */
  const barTables = shownParadigms.map((p) => ({
    id: p.id,
    short: p.short,
    gold: gatedOf(p).filter((c) => getM(p.id, c.id) >= GOLD_AT).length,
    total: gatedOf(p).length,
  }));
  const goldTables = paradigms.filter(
    (p) => gatedOf(p).every((c) => getM(p.id, c.id) >= GOLD_AT)
  ).length;

  /* One derived description of "the round is over", for the four modes that
     have rounds. Snipe, Lookup and Impostor are continuous streams — they
     re-aim or auto-advance — so they have no end and get no screen. */
  const allGold = goldCount === gatedOf(paradigm).length;
  const roundEnd = (() => {
    if (twinMode && phase === "done")
      return {
        headline: "TWIN ROUND COMPLETE",
        message: "The pair was chosen from the confusions you have actually recorded.",
        primary: { label: "Next pair", onClick: () => startRound("twin") },
      };
    if (mode === "fill" && phase === "done")
      return allGold
        ? {
            tone: "gold",
            headline: "TABLE COMPLETE",
            message: `Fully gilded — all ${paradigm.cells.length} cells are gold. Defend it and the whole table blanks.`,
            primary: { label: "Defend it", onClick: () => startRound("fill") },
          }
        : {
            headline: "ROUND COMPLETE",
            message: "Weak cells will blank again next round.",
            primary: { label: "Run it again", onClick: () => startRound("fill") },
          };
    if (mode === "race" && race?.finished)
      return race.finished === "done"
        ? {
            tone: "gold",
            headline: race.isRecord ? "τετέλεσται · NEW PERSONAL BEST" : "τετέλεσται",
            message: `${(race.timeMs / 1000).toFixed(1)}s${
              race.isRecord ? "" : ` · best ${(race.bestMs / 1000).toFixed(1)}s`
            }`,
            primary: { label: "Race again", onClick: () => startRound("race") },
          }
        : {
            tone: "wrong",
            headline: "THE CLOCK WINS",
            message: "The chant continues. Mistakes cost time, never mastery.",
            primary: { label: "Race again", onClick: () => startRound("race") },
          };
    if (mode === "scramble" && scramble?.result?.allCorrect)
      return {
        tone: "gold",
        headline: "τάξις · THE TABLE IS RESTORED",
        message:
          scrambleSolved > 0
            ? `${scrambleSolved} restored this session.`
            : "Every form is back where it belongs.",
        primary:
          scrambleFlow === "next"
            ? { label: "Next table →", onClick: nextScrambleTable }
            : { label: "Scramble again", onClick: () => startRound("scramble") },
        secondary:
          scrambleFlow === "next"
            ? { label: "Same table", onClick: () => startRound("scramble") }
            : { label: "Next table →", onClick: nextScrambleTable },
      };
    return null;
  })();

  /* On a phone the prompt bar is pinned and the page reserves room for it. On
     a wide screen it simply sits under the board — which is what makes the
     occlusion bug class STRUCTURALLY IMPOSSIBLE there rather than merely
     guarded against. Nothing overlays the board, so nothing can hide it. */
  const barClass = wide
    ? "w-full flex justify-center px-4 pt-4 pb-10"
    : "fixed bottom-0 left-0 right-0 flex justify-center px-4 pb-6 pt-6";

  /* ============================ render ============================ */
  return (
    <div
      className="min-h-screen w-full flex flex-col"
      style={{
        background: C.ink,
        color: C.marble,
        fontFamily: "'Jost', system-ui, sans-serif",
      }}
    >
      <TopBar
        unit={currentUnit}
        tables={barTables}
        mode={mode}
        wide={wide}
        onOpenTables={() => setSheet("tables")}
        onOpenModes={() => setSheet("modes")}
        onOpenSettings={() => setSheet("settings")}
      />

      <div className="w-full flex flex-1 min-h-0">
        {/* Desktop: the whole syllabus is permanently in view. Same
            container-agnostic TablesPanel the sheet renders — only the box
            around it differs, which is the contract set in Phase 2. */}
        {wide && (
          <aside
            data-test="tables-rail"
            className="shrink-0 overflow-y-auto px-4 py-4"
            style={{
              width: 320,
              borderRight: `1px solid ${C.line}`,
              position: "sticky",
              top: 50,
              height: "calc(100vh - 50px)",
            }}
          >
            <TablesPanel
              paradigms={paradigms}
              activeIds={new Set(twinMode ? twinIds : [paradigm.id])}
              getM={getM}
              onPick={changeParadigm}
              currentUnit={currentUnit}
              masteryMap={masteryMap}
            />
          </aside>
        )}

        <div
          className="flex-1 min-w-0 flex flex-col items-center px-4"
          style={{
            /* Phones reserve clearance for the pinned banner + tray, tallest
               during a multi-piece assembly (QA bar §7: never occlude the
               cell). Desktop pins nothing, so it reserves nothing. */
            paddingBottom: wide ? "2rem" : "clamp(11rem, 44vh, 24rem)",
          }}
        >
      {toast && (
        <div
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 toast-in px-4 py-2.5 rounded-xl text-sm max-w-md text-center"
          style={{ background: C.panelUp, border: `1px solid ${C.goldDeep}`, color: C.gold }}
        >
          {toast}
        </div>
      )}

      {/* per-answer feedback: costs no height when nothing is happening */}
      {(streak > 1 || fastFlash) && (
        <div className="w-full max-w-2xl flex gap-3 justify-end text-xs pt-2">
          {streak > 1 && <span style={{ color: C.aegean }}>streak ×{streak}</span>}
          {fastFlash && <span style={{ color: C.gold }}>ταχύς! +2</span>}
        </div>
      )}

      {/* race clock */}
      {mode === "race" && race && !race.finished && (
        <div className="w-full max-w-2xl mb-3 flex items-center gap-3 text-sm">
          <span
            className={race.deadline - race.now < 10000 ? "race-low" : ""}
            style={{
              color: race.deadline - race.now < 10000 ? C.wrong : C.aegean,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            ⏱ {(Math.max(0, race.deadline - race.now) / 1000).toFixed(1)}s
          </span>
          {race.bestMs != null && (
            <span style={{ color: C.faint }}>best {(race.bestMs / 1000).toFixed(1)}s</span>
          )}
          <span style={{ color: C.faint }}>— the whole table, column by column</span>
        </div>
      )}

      {/* lookup prompt */}
      {mode === "lookup" && lookup && (
        <div className="w-full max-w-2xl mb-3 text-sm" style={{ color: C.faint }}>
          Where does{" "}
          <span className="gk text-xl" style={{ color: C.marble }}>
            {lookup.form}
          </span>{" "}
          live?
          {lookup.required.length > 1 && (
            <span style={{ color: C.aegean }}>
              {"  "}({lookup.found.length}/{lookup.required.length} places — find them all)
            </span>
          )}
        </div>
      )}

      {/* the table(s) */}
      <div
        className={
          twinMode
            ? "w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-4"
            : "w-full max-w-2xl"
        }
      >
        {shownParadigms.map((p) => (
          <ParadigmTable
            key={p.id}
            paradigm={p}
            currentUnit={currentUnit}
            phase={twinMode ? "drill" : phase}
            mode={mode}
            sticky={twinMode}
            blanks={blanks}
            feedback={feedback}
            active={active}
            impostor={mode === "impostor" && p.id === paradigm.id ? impostor : null}
            lookup={mode === "lookup" && p.id === paradigm.id ? lookup : null}
            scramble={mode === "scramble" && p.id === paradigm.id ? scramble : null}
            dragHandlers={{ beginDrag, moveDrag, endDrag, cancelDrag }}
            assemblyPrefix={assemblyPrefix}
            getM={getM}
            onCellTap={(pid, cid) => {
              if (mode === "impostor") tapImpostorCell(cid);
              else if (mode === "lookup") tapLookupCell(cid);
              else if (
                blanks.has(cellKey(pid, cid)) &&
                feedback[cellKey(pid, cid)] !== "correct"
              )
                selectCell(paradigmOf(pid), cid);
            }}
          >
            {/* per-table footers only in single-table modes */}
            {!twinMode && mode === "fill" && phase === "study" && (
              <div className="mt-5 flex items-center justify-between gap-3">
                <div className="text-sm" style={{ color: C.faint }}>
                  Read it aloud. When you press begin, the table decays.
                </div>
                <button
                  onClick={beginDecay}
                  className="px-4 py-2 rounded-lg text-sm shrink-0"
                  style={{ background: C.aegeanDeep, border: `1px solid ${C.aegean}`, color: "#fff" }}
                >
                  Begin drilling
                </button>
              </div>
            )}
            {!twinMode && mode === "impostor" && impostorMsg && (
              <div className="mt-4 text-sm" style={{ color: C.faint }}>
                {impostorMsg}
              </div>
            )}
            {!twinMode &&
              paradigm.notes &&
              mode === "fill" &&
              (phase === "done" || phase === "study") && (
                <div className="mt-3 text-xs" style={{ color: C.faint }}>
                  {paradigm.notes}
                </div>
              )}
          </ParadigmTable>
        ))}
      </div>

      {/* One round-end screen for every mode that ends (see `roundEnd`). */}
      {roundEnd && (
        <RoundEnd
          mode={mode}
          tone={roundEnd.tone}
          headline={roundEnd.headline}
          message={roundEnd.message}
          primary={roundEnd.primary}
          secondary={roundEnd.secondary}
          onPickMode={changeMode}
          raceBest={raceBests[paradigm.id] ?? null}
        />
      )}

      {/* M5 accent finishing move */}
      {accentStage && (
        <div
          className={barClass}
          style={wide ? {} : { background: `linear-gradient(transparent, ${C.ink} 30%)` }}
        >
          <div className="max-w-2xl w-full">
            <div className="text-sm mb-2" style={{ color: C.faint }}>
              {accentStage.result === "correct" ? (
                <span style={{ color: C.gold }}>ὀρθῶς — the accent is yours too.</span>
              ) : accentStage.result === "wrong" ? (
                <span style={{ color: C.wrong }}>
                  Not quite — it is{" "}
                  <span className="gk text-lg" style={{ color: C.aegean }}>
                    {accentStage.form}
                  </span>
                </span>
              ) : (
                <>Now the accents — tap each vowel to cycle ◌ → ´ → ῀.</>
              )}
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="gk text-3xl" style={{ color: C.marble }}>
                {(() => {
                  let slot = -1;
                  return accentStage.segments.map((seg, i) => {
                    if (!seg.isSlot) return <span key={i}>{seg.text}</span>;
                    slot++;
                    const s = slot;
                    const shown = applyAccent(seg.text, accentStage.choices[s]);
                    const chosen = accentStage.choices[s] !== "none";
                    return (
                      <button
                        key={i}
                        onClick={() => cycleAccent(s)}
                        className="mx-0.5 px-1 rounded-md"
                        style={{
                          border: `1px solid ${chosen ? C.aegean : C.line}`,
                          color: chosen ? C.aegean : C.marble,
                          background: "rgba(111,179,216,0.06)",
                        }}
                      >
                        {shown}
                      </button>
                    );
                  });
                })()}
              </div>
              <div className="flex-1" />
              {!accentStage.result && (
                <>
                  <button
                    onClick={skipAccent}
                    className="px-3 py-2 rounded-lg text-xs"
                    style={{ border: `1px solid ${C.line}`, color: C.faint }}
                  >
                    Later
                  </button>
                  <button
                    onClick={confirmAccent}
                    className="px-4 py-2 rounded-lg text-sm"
                    style={{ background: C.aegeanDeep, border: `1px solid ${C.aegean}`, color: "#fff" }}
                  >
                    Confirm
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Scramble: the bank of loose forms + the Check gate */}
      {/* The pinned bar belongs to PLAYING. Once solved, RoundEnd owns the
          screen — leaving the bar up duplicated its own message and covered
          the "or try this table as…" row underneath it. */}
      {mode === "scramble" && scramble && phase === "drill" && !scramble.result?.allCorrect && (() => {
        const cells = paradigm.cells.filter((c) => c.unitMax <= currentUnit);
        const g = gradeScramble({ cells, placed: scramble.placed });
        return (
          <div
            ref={scrambleBarRef}
            className={barClass}
            style={wide ? {} : { background: `linear-gradient(transparent, ${C.ink} 22%)` }}
          >
            {/* Wider on desktop: the bank is the one element that genuinely
                wants the spare horizontal axis, so let it have it. */}
            <div className={wide ? "max-w-4xl w-full" : "max-w-2xl w-full"}>
              <div
                className="prompt-in w-full rounded-xl px-4 py-3 mb-3"
                style={{ background: C.panel, border: `1px solid ${C.line}` }}
              >
                <div className="flex items-center gap-3 flex-wrap">
                  <span
                    className="px-2 py-0.5 rounded text-xs shrink-0"
                    style={{
                      background: C.aegeanDeep,
                      border: `1px solid ${C.aegean}`,
                      color: "#fff",
                      letterSpacing: "0.12em",
                    }}
                  >
                    SCRAMBLE
                  </span>
                  <span className="text-sm" style={{ color: C.marble }}>
                    {scramble.result
                      ? `${scramble.result.wrongCells.length} in the wrong place — marked in red.`
                      : g.remaining > 0
                        ? `Drag each form to its cell — ${g.remaining} left`
                        : "Every slot filled. Check it."}
                  </span>
                  <span className="flex-1" />
                  {(
                    <button
                      onClick={checkScramble}
                      disabled={!g.complete}
                      className="px-4 py-2 rounded-lg text-sm shrink-0"
                      style={{
                        background: g.complete ? C.aegeanDeep : "transparent",
                        border: `1px solid ${g.complete ? C.aegean : C.line}`,
                        color: g.complete ? "#fff" : C.line,
                        cursor: g.complete ? "pointer" : "not-allowed",
                      }}
                    >
                      Check
                    </button>
                  )}
                </div>

                {/* what happens after a solve, and how the session is going */}
                <div className="flex items-center gap-2 mt-2 flex-wrap text-xs">
                  <span style={{ color: C.faint, letterSpacing: "0.08em" }}>AFTER SOLVING</span>
                  {[
                    ["same", "Same table"],
                    ["next", "Next table"],
                  ].map(([f, lbl]) => (
                    <button
                      key={f}
                      onClick={() => setFlow(f)}
                      className="px-2 py-0.5 rounded"
                      style={{
                        background: scrambleFlow === f ? C.aegeanDeep : "transparent",
                        border: `1px solid ${scrambleFlow === f ? C.aegean : C.line}`,
                        color: scrambleFlow === f ? "#fff" : C.faint,
                      }}
                    >
                      {lbl}
                    </button>
                  ))}
                  <span className="flex-1" />
                  {scrambleSolved > 0 && (
                    <span style={{ color: C.gold }}>
                      {scrambleSolved} restored
                    </span>
                  )}
                </div>
              </div>

              {/* The bank stays ONE row and scrolls sideways however many forms
                  it holds: on a phone vertical space is what the board needs,
                  and horizontal space is what is going spare. */}
              <div
                data-drop="bank"
                className="w-full rounded-xl"
                style={{
                  padding: "0.5rem",
                  border: `1px dashed ${scramble.bank.length ? C.line : "transparent"}`,
                }}
              >
                <div className="bank-strip" style={{ minHeight: "3rem" }}>
                {scramble.bank.map((tile) => (
                  <span
                    key={tile.id}
                    className="chip gk px-4 py-2.5 rounded-xl text-xl draggable draggable-x"
                    onPointerDown={(e) => beginDrag(e, tile, { type: "bank" })}
                    onPointerMove={moveDrag}
                    onPointerUp={endDrag}
                    onPointerCancel={cancelDrag}
                    style={{
                      background: C.panelUp,
                      border: `1px solid ${C.line}`,
                      color: C.marble,
                      boxShadow: "0 3px 0 rgba(0,0,0,0.35)",
                    }}
                  >
                    {tile.form}
                  </span>
                ))}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* the tile under the finger */}
      {drag && (
        <span
          className="drag-ghost gk px-4 py-2.5 rounded-xl text-xl"
          style={{
            left: drag.x,
            top: drag.y,
            background: C.panelUp,
            border: `1px solid ${C.aegean}`,
            color: C.marble,
            boxShadow: "0 6px 18px rgba(0,0,0,0.5)",
          }}
        >
          {drag.tile.form}
        </span>
      )}

      {/* ask banner + chip tray, pinned together above the fold */}
      {!accentStage && active && phase === "drill" && mode !== "impostor" && mode !== "lookup" && (
        <div
          className={barClass}
          style={wide ? {} : { background: `linear-gradient(transparent, ${C.ink} 22%)` }}
        >
          <div className="max-w-2xl w-full">
            <PromptBanner
              key={`${active.pid}:${active.cid}`}
              label={labelFor(
                paradigmOf(active.pid),
                paradigmOf(active.pid).cells.find((c) => c.id === active.cid)
              )}
              tableShort={paradigmOf(active.pid).short}
              twinMode={twinMode}
              assembly={assembly}
              refusal={refusal}
            />
            <div className="flex flex-wrap gap-2 justify-center w-full">
            {tray.map((chip) => (
              <button
                key={chip.id}
                onClick={() => tapChip(chip)}
                className={`chip gk px-4 py-2.5 rounded-xl text-xl ${
                  refusal?.chipId === chip.id ? "refuse" : ""
                }`}
                style={{
                  background: C.panelUp,
                  border: `1px solid ${refusal?.chipId === chip.id ? C.wrong : C.line}`,
                  color: C.marble,
                  boxShadow: "0 3px 0 rgba(0,0,0,0.35)",
                  transition: "transform .08s ease",
                }}
              >
                {chip.text === "" ? "—" : chip.text}
              </button>
            ))}
            </div>
          </div>
        </div>
      )}

      {/* new-tables-unlocked overlay. Sits ABOVE the sheets (z 70): an unlock
          must never be hidden behind whatever summoned it. */}
      {unlock && (
        <div
          className="fixed inset-0 flex items-center justify-center px-6"
          style={{ background: "rgba(18,20,28,0.88)", zIndex: 90 }}
        >
          <div
            className="w-full max-w-md rounded-2xl p-6 rise"
            style={{ background: C.panel, border: `1px solid ${C.goldDeep}` }}
          >
            <div className="text-xs" style={{ color: C.gold, letterSpacing: "0.12em" }}>
              UNIT {unlock.unit} · NEW TABLES UNLOCKED
            </div>
            <div className="text-sm mt-1" style={{ color: C.marble }}>
              {unitTitle(unlock.unit)}
            </div>
            <ul className="my-4 space-y-2">
              {unlock.paradigms.map((p) => (
                <li key={p.id} className="gk text-lg" style={{ color: C.marble }}>
                  {p.label}
                </li>
              ))}
            </ul>
            <div className="text-xs mb-4" style={{ color: C.faint }}>
              Each enters through the study-then-decay flow. Read it aloud once — then it
              starts fading.
            </div>
            <button
              onClick={() => setUnlock(null)}
              className="px-4 py-2 rounded-lg text-sm w-full"
              style={{ background: C.aegeanDeep, border: `1px solid ${C.aegean}`, color: "#fff" }}
            >
              Begin
            </button>
          </div>
        </div>
      )}
        </div>
      </div>

      {/* The Tables sheet is the NARROW presentation of the rail above — never
          both, or picking a table would happen in two places at once. */}
      <Sheet
        open={!wide && sheet === "tables"}
        onClose={() => setSheet(null)}
        title="Tables"
        meta={`${paradigms.length} UNLOCKED · ${totalGold} GILDED`}
      >
        <TablesPanel
          paradigms={paradigms}
          activeIds={new Set(twinMode ? twinIds : [paradigm.id])}
          getM={getM}
          onPick={changeParadigm}
          currentUnit={currentUnit}
          masteryMap={masteryMap}
        />
      </Sheet>

      <Sheet
        open={sheet === "modes"}
        onClose={() => setSheet(null)}
        title="How to drill"
        meta={paradigm.short}
      >
        <ModesPanel mode={mode} onPick={changeMode} />
      </Sheet>

      <Sheet
        open={sheet === "settings"}
        onClose={() => setSheet(null)}
        title="Progress &amp; syllabus"
      >
        <SettingsPanel
          currentUnit={currentUnit}
          onChangeUnit={changeUnit}
          syllabus={syllabus}
          onSaveSyllabus={saveSyllabus}
          totalGold={totalGold}
          totalCells={totalCells}
          accentPct={accentPct}
          goldTables={goldTables}
          totalTables={paradigms.length}
        />
      </Sheet>
    </div>
  );
}
