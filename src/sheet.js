/* Bottom-sheet gesture maths.
 *
 * Pure and React-free, for the same reason grading.js is: the feel of a
 * dismiss gesture is a set of thresholds, and thresholds are exactly the kind
 * of thing that silently drifts unless a test pins them down.
 *
 * Sheets in this app stay open until deliberately dismissed — swipe down,
 * tap the scrim, or press Escape. Picking a table does NOT close them, so the
 * dismiss gesture is the only way out and it has to feel right.
 */

/* Travel before a touch counts as a drag rather than a tap. Deliberately the
   same 6 px as Scramble's DRAG_SLOP — two different thresholds for "did the
   finger actually move" would be a bug waiting to happen. */
export const SHEET_SLOP = 6;

/* Dragged more than this fraction of the sheet's own height → dismiss. */
export const DISMISS_FRACTION = 0.28;

/* A downward flick this fast dismisses regardless of distance, in px/ms.
   ~0.55 is a brisk flick; a slow drag never reaches it. */
export const DISMISS_VELOCITY = 0.55;

/* Only the most recent slice of a gesture decides the flick speed — otherwise
   a long slow drag that ends fast reads as slow. */
const VELOCITY_WINDOW_MS = 120;

/* Upward over-drag resists instead of following the finger, and stops. */
const RUBBER_DIVISOR = 3;
const RUBBER_LIMIT = 48;

/**
 * Where the sheet actually sits for a given raw finger delta.
 * Downward follows 1:1; upward rubber-bands and caps.
 */
export function sheetOffset(dy) {
  if (dy >= 0) return dy;
  return Math.max(dy / RUBBER_DIVISOR, -RUBBER_LIMIT);
}

/**
 * Downward speed in px/ms over the tail of the gesture.
 * `samples` is [{ y, t }, …] oldest first; y is the raw delta, t a timestamp.
 */
export function dragVelocity(samples) {
  if (!samples || samples.length < 2) return 0;
  const last = samples[samples.length - 1];
  const cutoff = last.t - VELOCITY_WINDOW_MS;
  let first = samples[0];
  for (const s of samples) {
    if (s.t >= cutoff) {
      first = s;
      break;
    }
  }
  const dt = last.t - first.t;
  if (dt <= 0) return 0;
  return (last.y - first.y) / dt;
}

/**
 * Should the gesture dismiss the sheet?
 * Distance OR speed — a short fast flick and a long slow drag both count.
 */
export function shouldDismiss({ dy, velocity = 0, height }) {
  if (!(dy > 0)) return false; // upward or stationary never dismisses
  if (velocity >= DISMISS_VELOCITY) return true;
  if (!(height > 0)) return false;
  return dy / height >= DISMISS_FRACTION;
}
