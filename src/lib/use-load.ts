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
// The last answer of every screen that passes a `cacheKey`. Opening the same card again shows what it knew at once and
// refreshes in the background, so going back and forth between a list and a card feels instant.
const answers = new Map<string, unknown>();
const MAX_ANSWERS = 80;

/** Hands a screen an answer a list already holds (for example a card's data) so the card opens with no wait. */
export function primeLoad(cacheKey: string, data: unknown): void {
  if (answers.has(cacheKey)) return;
  answers.set(cacheKey, data);
  if (answers.size > MAX_ANSWERS) answers.delete(answers.keys().next().value as string);
}

export function useLoad<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  deps: React.DependencyList,
  cacheKey?: string,
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
          if (cacheKey) {
            answers.delete(cacheKey);
            answers.set(cacheKey, data);
            if (answers.size > MAX_ANSWERS) answers.delete(answers.keys().next().value as string);
          }
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
  const known = cacheKey && answers.has(cacheKey) ? (answers.get(cacheKey) as T) : undefined;
  const fresh =
    settled && sameInputs && (settled.tick === tick || settled.state.status === "ready");
  const state: LoadState<T> = fresh
    ? settled.state
    : known !== undefined
      ? { status: "ready", data: known, error: null }
      : { status: "loading", data: null, error: null };
  const refreshing = Boolean(
    (settled && sameInputs && settled.tick !== tick && settled.state.status === "ready") ||
    (!fresh && known !== undefined),
  );
  return { ...state, reload, refreshing };
}
