import { useEffect, useRef, useState } from "react";
import { C } from "../theme.js";
import { SHEET_SLOP, dragVelocity, sheetOffset, shouldDismiss } from "../sheet.js";

/* ---------- bottom sheet ----------
   The one container for Tables, Modes and Settings. It sits OVER a dimmed
   board rather than replacing it, so you always choose in relation to what you
   were just looking at — and it stays open until deliberately dismissed, so
   picking a table does not kick you out of browsing.

   Drag is bound to the header only, never the body: the body has to stay
   scrollable, and a sheet that dismisses when you try to scroll its contents
   is the single most irritating way to get this wrong. */
export default function Sheet({ open, onClose, title, meta, children, maxHeight = "82vh" }) {
  const [dy, setDy] = useState(0);
  const [shown, setShown] = useState(false);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef(null);
  const samplesRef = useRef([]);
  const sheetRef = useRef(null);

  /* Mount off-screen, then slide up on the next frame so the transition runs. */
  useEffect(() => {
    if (!open) {
      setShown(false);
      setDy(0);
      return;
    }
    const r = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(r);
  }, [open]);

  /* Escape closes. Accessibility hygiene — the app itself is pointer-driven. */
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  /* The page must not scroll behind an open sheet. */
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  /* Move focus in on open, hand it back on close. */
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement;
    sheetRef.current?.focus();
    return () => prev?.focus?.();
  }, [open]);

  if (!open) return null;

  const beginDrag = (e) => {
    if (e.button > 0) return;
    try {
      e.currentTarget.setPointerCapture?.(e.pointerId);
    } catch {}
    dragRef.current = { y0: e.clientY, live: false };
    samplesRef.current = [{ y: 0, t: performance.now() }];
  };

  const moveDrag = (e) => {
    const d = dragRef.current;
    if (!d) return;
    const raw = e.clientY - d.y0;
    if (!d.live) {
      if (Math.abs(raw) < SHEET_SLOP) return;
      d.live = true;
      setDragging(true);
    }
    e.preventDefault();
    samplesRef.current.push({ y: raw, t: performance.now() });
    if (samplesRef.current.length > 8) samplesRef.current.shift();
    setDy(sheetOffset(raw));
  };

  const endDrag = (e) => {
    const d = dragRef.current;
    dragRef.current = null;
    setDragging(false);
    if (!d) return;
    try {
      e.currentTarget.releasePointerCapture?.(e.pointerId);
    } catch {}
    const raw = e.clientY - d.y0;
    const height = sheetRef.current?.getBoundingClientRect().height ?? 0;
    const dismiss = shouldDismiss({
      dy: raw,
      velocity: dragVelocity(samplesRef.current),
      height,
    });
    setDy(0);
    if (dismiss) onClose();
  };

  /* The browser cancels the pointer if it takes the gesture over; snap back. */
  const cancelDrag = () => {
    dragRef.current = null;
    setDragging(false);
    setDy(0);
  };

  return (
    <div className="fixed inset-0" style={{ zIndex: 70 }}>
      <div
        onClick={onClose}
        className="absolute inset-0 sheet-anim"
        style={{ background: "rgba(6,7,11,0.66)", opacity: shown ? 1 : 0 }}
      />
      <div
        ref={sheetRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`absolute left-0 right-0 bottom-0 flex flex-col outline-none ${
          dragging ? "" : "sheet-anim"
        }`}
        style={{
          maxHeight,
          background: C.panel,
          borderTop: `1px solid ${C.line}`,
          borderRadius: "18px 18px 0 0",
          boxShadow: "0 -14px 40px rgba(0,0,0,0.5)",
          transform: shown ? `translateY(${dy}px)` : "translateY(100%)",
        }}
      >
        {/* grab area: handle + title. Drag lives here so the body can scroll. */}
        <div
          className="shrink-0 sheet-grab"
          onPointerDown={beginDrag}
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
          onPointerCancel={cancelDrag}
        >
          <div
            className="mx-auto mt-2.5 mb-1 rounded"
            style={{ width: 38, height: 4, background: C.line }}
          />
          <div
            className="flex items-baseline justify-between px-4 pb-2.5 pt-1"
            style={{ borderBottom: `1px solid ${C.line}` }}
          >
            <h2 className="text-base" style={{ color: C.marble }}>
              {title}
            </h2>
            {meta && (
              <span className="text-xs" style={{ color: C.faint, letterSpacing: "0.1em" }}>
                {meta}
              </span>
            )}
          </div>
        </div>

        <div className="overflow-y-auto px-4 py-3">{children}</div>
      </div>
    </div>
  );
}
