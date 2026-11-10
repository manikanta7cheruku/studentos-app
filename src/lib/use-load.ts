"use client";

import * as React from "react";
import { ApiError } from "./api-client";

export type LoadState<T> =
  | { status: "loading"; data: null; error: null }
  | { status: "ready"; data: T; error: null }
  | { status: "error"; data: null; error: ApiError | Error };

type Settled<T> = { tick: number; deps: React.DependencyList; state: LoadState<T> };

function sameDeps(a: React.DependencyList, b: React.DependencyList): boolean {
  return a.length === b.length && a.every((item, i) => Object.is(item, b[i]));
}

/**
 * Runs an async call when the screen opens (and again when `deps` change or `reload` is called) and gives back
 * loading, ready or error. A late answer from an old call is ignored. Screens use it so every data screen has the same
 * states: loading, error with a retry, and ready (empty is decided by the screen).
 *
 * How it avoids setting state inside the effect: the answer is stored together with the
 * deps and reload count it belongs to, and "loading" simply means "the stored answer belongs to older deps".
 */
export function useLoad<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  deps: React.DependencyList,
): LoadState<T> & { reload: () => void; refreshing: boolean } {
  const [tick, setTick] = React.useState(0);
  const [settled, setSettled] = React.useState<Settled<T> | null>(null);
  const fnRef = React.useRef(fn);
  React.useEffect(() => {
    fnRef.current = fn;
  });

  React.useEffect(() => {
    const controller = new AbortController();
    fnRef
      .current(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) {
          setSettled({ tick, deps, state: { status: "ready", data, error: null } });
        }
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setSettled({
          tick,
          deps,
          state: {
            status: "error",
            data: null,
            error: error instanceof Error ? error : new Error(String(error)),
          },
        });
      });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, ...deps]);

  const reload = React.useCallback(() => setTick((n) => n + 1), []);
  const sameInputs = settled ? sameDeps(settled.deps, deps) : false;
  // After `reload` the screen keeps showing the data it already has (and `refreshing` is true) instead of falling
  // back to a skeleton: an answer to "Accept" must not make the whole page flash. A failed answer still shows the
  // error, and a retry after an error shows loading.
  const state: LoadState<T> =
    settled && sameInputs && (settled.tick === tick || settled.state.status === "ready")
      ? settled.state
      : { status: "loading", data: null, error: null };
  const refreshing = Boolean(
    settled && sameInputs && settled.tick !== tick && settled.state.status === "ready",
  );
  return { ...state, reload, refreshing };
}
