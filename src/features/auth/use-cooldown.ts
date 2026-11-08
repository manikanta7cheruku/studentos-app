"use client";

import * as React from "react";

/**
 * A "wait N seconds" timer for the resend button. `start(seconds)` begins it, `remaining` counts down to 0.
 * State is only set from the timer callback and from `start`, never directly in an effect body.
 */
export function useCooldown(): { remaining: number; start: (seconds: number) => void } {
  const [until, setUntil] = React.useState(0);
  const [now, setNow] = React.useState(() => Date.now());

  React.useEffect(() => {
    if (until <= Date.now()) return;
    const timer = window.setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= until) window.clearInterval(timer);
    }, 500);
    return () => window.clearInterval(timer);
  }, [until]);

  const start = React.useCallback((seconds: number) => {
    const current = Date.now();
    setNow(current);
    setUntil(current + seconds * 1000);
  }, []);

  return { remaining: Math.max(0, Math.ceil((until - now) / 1000)), start };
}
