import { useCallback, useRef, useState } from "react";

/**
 * Runs an async function at most once at a time (ref + state guard against double clicks).
 */
export function useAsyncAction<
  Args extends unknown[],
  R = void,
>(fn: (...args: Args) => Promise<R>) {
  const pendingRef = useRef(false);
  const [pending, setPending] = useState(false);

  const run = useCallback(
    async (...args: Args): Promise<R | undefined> => {
      if (pendingRef.current) return undefined;
      pendingRef.current = true;
      setPending(true);
      try {
        return await fn(...args);
      } finally {
        pendingRef.current = false;
        setPending(false);
      }
    },
    [fn],
  );

  return { run, pending };
}
