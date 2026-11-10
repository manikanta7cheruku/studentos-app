"use client";

import * as React from "react";
import { newIdempotencyKey } from "./api-client";

/**
 * One user action keeps one Idempotency-Key, so a double tap or a retry after a dropped connection cannot create the
 * same thing twice. Call `reset()` after a real answer from the server (success or a refusal), so the next try is a new action.
 */
export function useAttempt() {
  const key = React.useRef<string | null>(null);
  return React.useMemo(
    () => ({
      get: () => (key.current ??= newIdempotencyKey()),
      reset: () => {
        key.current = null;
      },
    }),
    [],
  );
}
