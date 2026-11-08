import React, { useEffect, useRef, useState } from "react";

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export interface AnimatedNumberProps {
  value: number;
  /** Format the interpolated value for display. Defaults to String. */
  format?: (n: number) => string;
  durationMs?: number;
  className?: string;
  /** When this changes, animation restarts from 0 (e.g. period filter). */
  restartKey?: string | number;
}

/**
 * Counts from 0 up to `value` (or from previous value when restartKey is stable).
 * Respects prefers-reduced-motion.
 */
export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value,
  format = (n) => String(Math.round(n)),
  durationMs = 900,
  className,
  restartKey,
}) => {
  const [display, setDisplay] = useState(() =>
    prefersReducedMotion() ? value : 0,
  );
  const displayRef = useRef(display);
  const rafRef = useRef<number | null>(null);
  const prevRestartKey = useRef(restartKey);

  useEffect(() => {
    displayRef.current = display;
  }, [display]);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setDisplay(value);
      return;
    }

    const fromZero = prevRestartKey.current !== restartKey;
    prevRestartKey.current = restartKey;

    const from = fromZero ? 0 : displayRef.current;
    const to = value;
    if (from === to) {
      setDisplay(to);
      return;
    }

    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
    }

    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const next = from + (to - from) * easeOutCubic(t);
      setDisplay(next);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setDisplay(to);
        rafRef.current = null;
      }
    };

    if (fromZero) setDisplay(0);
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [value, durationMs, restartKey]);

  return <span className={className}>{format(display)}</span>;
};
