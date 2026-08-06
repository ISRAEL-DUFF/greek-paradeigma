import { useEffect, useState } from "react";

/* At and above this width the layout stops being a phone: horizontal space is
   the spare axis, so the Tables panel becomes a permanent rail and the prompt
   bar stops being pinned. 1024 is the first width where a 300px rail plus a
   readable board both fit without either being cramped. */
export const WIDE_PX = 1024;

/* Layout that differs STRUCTURALLY (a rail instead of a sheet, an inline bar
   instead of a fixed one) cannot be done in CSS alone, so the breakpoint has
   to exist in JS too. Kept in one place so the two can never disagree. */
export default function useWide() {
  const [wide, setWide] = useState(
    () => typeof window !== "undefined" && window.matchMedia(`(min-width: ${WIDE_PX}px)`).matches
  );

  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${WIDE_PX}px)`);
    const onChange = (e) => setWide(e.matches);
    mq.addEventListener("change", onChange);
    setWide(mq.matches);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return wide;
}
