import * as React from "react";

const KEY = "studentos.tour.v1";
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** True once the tour was finished or skipped on this device. When storage is blocked it counts as done, so nobody is nagged. */
export function readTourDone(): boolean {
  try {
    return window.localStorage.getItem(KEY) === "done";
  } catch {
    return true;
  }
}

export function markTourDone() {
  try {
    window.localStorage.setItem(KEY, "done");
  } catch {
    // Storage is blocked: the tour can still be replayed from the ? button.
  }
  for (const listener of listeners) listener();
}

/** Whether the tour has been seen. The first answer (the server render) is "seen", so nothing flashes before the device is read. */
export function useTourDone(): boolean {
  return React.useSyncExternalStore(subscribe, readTourDone, () => true);
}
