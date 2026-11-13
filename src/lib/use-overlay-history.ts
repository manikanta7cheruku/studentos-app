"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

const KEY = "__overlay";

/**
 * Makes the Back button (and the Android back gesture) close an open sheet or dialog instead of leaving the page.
 *
 * When the overlay opens it adds one history entry. Back removes that entry, and the overlay closes. When the overlay is closed
 * some other way (tap outside, Escape, a button) the extra entry is taken off again, so history stays clean. To leave the page
 * from inside an overlay (a link in it), use `goTo(href)`: it removes the entry first and then opens the page, so Back from the
 * new page returns to where the person was, not to the overlay.
 */
export function useOverlayHistory(open: boolean, onOpenChange: (open: boolean) => void) {
  const router = useRouter();
  const mine = React.useRef<string | null>(null);
  const pending = React.useRef<string | null>(null);
  const latest = React.useRef(onOpenChange);
  React.useEffect(() => {
    latest.current = onOpenChange;
  });

  React.useEffect(() => {
    if (!open) return;
    const token = Math.random().toString(36).slice(2);
    mine.current = token;
    window.history.pushState({ ...(window.history.state ?? {}), [KEY]: token }, "");
    const onPop = () => {
      // Back was pressed (or goTo asked for it): our entry is gone, so close the overlay.
      mine.current = null;
      latest.current(false);
      const href = pending.current;
      pending.current = null;
      if (href) router.push(href);
    };
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      // Closed another way: remove the extra entry, if it is still the top one.
      if (mine.current === token && window.history.state?.[KEY] === token) {
        mine.current = null;
        window.history.back();
      }
    };
  }, [open, router]);

  const goTo = React.useCallback(
    (href: string) => {
      if (mine.current) {
        pending.current = href;
        window.history.back();
      } else {
        router.push(href);
      }
    },
    [router],
  );
  return { goTo };
}
