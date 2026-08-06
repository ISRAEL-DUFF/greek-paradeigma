import { describe, it, expect } from "vitest";
import {
  SHEET_SLOP,
  DISMISS_FRACTION,
  DISMISS_VELOCITY,
  sheetOffset,
  dragVelocity,
  shouldDismiss,
} from "./sheet.js";

describe("sheetOffset", () => {
  it("follows the finger exactly on the way down", () => {
    expect(sheetOffset(0)).toBe(0);
    expect(sheetOffset(40)).toBe(40);
    expect(sheetOffset(400)).toBe(400);
  });

  it("resists upward over-drag instead of following", () => {
    expect(sheetOffset(-30)).toBe(-10);
    expect(Math.abs(sheetOffset(-30))).toBeLessThan(30);
  });

  it("caps upward over-drag, so the sheet can never fly off the top", () => {
    expect(sheetOffset(-10000)).toBe(-48);
  });

  it("is monotonic — dragging further never moves the sheet back", () => {
    let prev = -Infinity;
    for (let dy = -600; dy <= 600; dy += 7) {
      const y = sheetOffset(dy);
      expect(y).toBeGreaterThanOrEqual(prev);
      prev = y;
    }
  });
});

describe("dragVelocity", () => {
  it("is zero without at least two samples", () => {
    expect(dragVelocity([])).toBe(0);
    expect(dragVelocity([{ y: 10, t: 100 }])).toBe(0);
    expect(dragVelocity(undefined)).toBe(0);
  });

  it("measures px per ms downward", () => {
    expect(dragVelocity([{ y: 0, t: 0 }, { y: 100, t: 100 }])).toBeCloseTo(1);
  });

  it("is negative for an upward gesture", () => {
    expect(dragVelocity([{ y: 0, t: 0 }, { y: -50, t: 100 }])).toBeCloseTo(-0.5);
  });

  it("never divides by zero when samples share a timestamp", () => {
    expect(dragVelocity([{ y: 0, t: 5 }, { y: 90, t: 5 }])).toBe(0);
  });

  it("judges only the tail, so a slow drag ending in a flick reads as fast", () => {
    const samples = [
      { y: 0, t: 0 },
      { y: 10, t: 800 }, // 800ms of barely moving
      { y: 20, t: 900 },
      { y: 120, t: 960 }, // then a flick
    ];
    expect(dragVelocity(samples)).toBeGreaterThan(DISMISS_VELOCITY);
  });

  it("judges only the tail, so a fast drag ending stationary reads as slow", () => {
    const samples = [
      { y: 0, t: 0 },
      { y: 300, t: 100 }, // fast
      { y: 302, t: 200 },
      { y: 303, t: 300 }, // then held still
    ];
    expect(dragVelocity(samples)).toBeLessThan(DISMISS_VELOCITY);
  });
});

describe("shouldDismiss", () => {
  const H = 600;

  it("ignores upward and stationary gestures entirely", () => {
    expect(shouldDismiss({ dy: -300, velocity: 5, height: H })).toBe(false);
    expect(shouldDismiss({ dy: 0, velocity: 5, height: H })).toBe(false);
  });

  it("keeps the sheet for a small slow drag", () => {
    expect(shouldDismiss({ dy: 30, velocity: 0.05, height: H })).toBe(false);
  });

  it("dismisses once dragged past the distance threshold", () => {
    const past = H * DISMISS_FRACTION + 1;
    expect(shouldDismiss({ dy: past, velocity: 0, height: H })).toBe(true);
  });

  it("holds just short of the distance threshold", () => {
    const shy = H * DISMISS_FRACTION - 1;
    expect(shouldDismiss({ dy: shy, velocity: 0, height: H })).toBe(false);
  });

  it("dismisses on a fast flick even when barely moved", () => {
    expect(shouldDismiss({ dy: 12, velocity: DISMISS_VELOCITY, height: H })).toBe(true);
  });

  it("scales with the sheet's own height, not an absolute distance", () => {
    // 100px dismisses a short sheet but not a tall one
    expect(shouldDismiss({ dy: 100, velocity: 0, height: 200 })).toBe(true);
    expect(shouldDismiss({ dy: 100, velocity: 0, height: 1000 })).toBe(false);
  });

  it("does not dismiss on distance alone when the height is unknown", () => {
    expect(shouldDismiss({ dy: 500, velocity: 0, height: 0 })).toBe(false);
    // …but a flick still works without a measurable height
    expect(shouldDismiss({ dy: 500, velocity: 1, height: 0 })).toBe(true);
  });

  it("treats velocity as optional", () => {
    expect(shouldDismiss({ dy: 400, height: H })).toBe(true);
  });
});

describe("thresholds", () => {
  it("shares Scramble's 6px slop, so 'did the finger move' means one thing", () => {
    expect(SHEET_SLOP).toBe(6);
  });

  it("dismisses on less than half the sheet — a full swipe should not be needed", () => {
    expect(DISMISS_FRACTION).toBeGreaterThan(0);
    expect(DISMISS_FRACTION).toBeLessThan(0.5);
  });
});
