"use client";

import * as React from "react";
import { WifiOffIcon } from "lucide-react";

function subscribe(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

/**
 * A quiet bar at the top of every page while the device has no connection. Screens that fail to load show their own
 * error with a retry; this tells people why, and that what they type now will not be saved until they are back.
 */
export function OfflineBanner() {
  const online = React.useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );
  if (online) return null;
  return (
    <div
      role="status"
      className="sticky top-0 z-[60] flex items-center gap-2.5 border-b border-warning/40 bg-warning/10 px-4 py-2.5 text-[15px] text-ink"
    >
      <WifiOffIcon aria-hidden="true" className="size-5 shrink-0 text-warning" />
      <span>
        <strong className="font-semibold">You are offline.</strong> Nothing you do is saved until
        the connection is back.
      </span>
    </div>
  );
}
