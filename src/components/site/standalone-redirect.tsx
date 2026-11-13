"use client";

import * as React from "react";

/**
 * The landing page is for visitors. When StudentOS is opened as an installed app (from the home screen) there is nothing to
 * sell, so go straight to /start, which finds the right place: sign in, the welcome steps, or the person's home.
 */
export function StandaloneRedirect() {
  React.useEffect(() => {
    const installed =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (installed) window.location.replace("/start");
  }, []);
  return null;
}
