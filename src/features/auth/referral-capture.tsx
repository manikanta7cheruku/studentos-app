"use client";

import * as React from "react";
import { rememberReferral } from "@/lib/referral";

/** Remembers the code from an invite link (?ref=...) so it can be counted when the new person finishes the tour. */
export function ReferralCapture() {
  React.useEffect(() => {
    rememberReferral(new URLSearchParams(window.location.search).get("ref"));
  }, []);
  return null;
}
