/* Layout occlusion check — paste into the browser console with the dev server
 * running, or run it through an automation tool.
 *
 * WHY THIS EXISTS: the only bug class that has repeatedly escaped this project
 * is "element A is hidden behind element B" — the chip tray over the active
 * cell, the Scramble bank over its drop targets, the picker scrolling to the
 * wrong place. Vitest runs in jsdom, which has NO layout engine, so no unit
 * test can ever catch these. This is the missing gate.
 *
 * Usage:  await measureLayout()            // every mode, current viewport
 *         await measureLayout(['scramble']) // just one
 *
 * Every row must report ok:true. A false means something on the board is
 * underneath the pinned bottom bar, where it cannot be seen or tapped.
 */
window.measureLayout = async function measureLayout(
  only = ["fill", "snipe", "impostor", "lookup", "twin", "race", "scramble"]
) {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const rect = (el) => el.getBoundingClientRect();

  const openModes = async () => {
    const pill = document.querySelector('[data-test="mode-pill"]');
    pill.click();
    await sleep(420);
    return document.querySelector('[role="dialog"]');
  };

  const rows = [];
  for (const mode of only) {
    const sheet = await openModes();
    const btn = [...sheet.querySelectorAll("button")].find(
      (b) => b.innerText.trim().split(/\s+/)[0].toLowerCase() === mode
    );
    if (!btn) {
      rows.push({ mode, ok: false, note: "mode not offered" });
      continue;
    }
    btn.click();
    await sleep(250);
    /* Sheets stay open until dismissed, by design — so dismiss it before
       measuring, or the sheet's own fixed container is what gets measured
       instead of the bottom bar. */
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await sleep(750);

    // the pinned bottom bar, if this mode has one on screen right now
    const bottomBar = [...document.querySelectorAll("div")].find((d) => {
      const s = getComputedStyle(d);
      const r = rect(d);
      return s.position === "fixed" && r.height > 40 && Math.abs(r.bottom - innerHeight) < 2;
    });
    const barTop = bottomBar ? rect(bottomBar).top : innerHeight;

    const topBar = document.querySelector('[data-test="top-bar"]');
    const topBarBottom = topBar ? rect(topBar).bottom : 0;

    const cells = [...document.querySelectorAll('[id^="cell-"], [data-drop^="cell:"]')];
    const board = cells[0]?.closest('[class*="rounded-2xl"]');

    // every cell must be reachable: scrollable into the gap between the bars
    const gap = barTop - topBarBottom;
    const tallest = cells.reduce((m, c) => Math.max(m, rect(c).height), 0);

    rows.push({
      mode,
      cells: cells.length,
      topBarH: Math.round(topBarBottom),
      barTop: Math.round(barTop),
      gap: Math.round(gap),
      tallestCell: Math.round(tallest),
      boardTop: board ? Math.round(rect(board).top) : null,
      // a cell taller than the usable gap can never be fully seen
      ok: gap > tallest + 8,
    });
  }
  console.table(rows);
  return rows;
};
