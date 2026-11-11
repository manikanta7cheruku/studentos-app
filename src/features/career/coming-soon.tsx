"use client";

import * as React from "react";
import { BriefcaseIcon, CheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Poster } from "@/components/app/poster";

const KEY = "studentos-careers-notify";

/**
 * Careers is a big piece of work that is not built yet. This page says so honestly. "Notify me" remembers the wish on
 * this device only (nothing is sent anywhere), so the button gives a real answer without a promise we cannot keep yet.
 */
function readWish(): boolean {
  try {
    return window.localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  window.addEventListener("careers-wish", onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener("careers-wish", onChange);
  };
}

export function CareersComingSoon() {
  // The wish lives in this device's storage, so it is read as an outside source (false while the server renders).
  const on = React.useSyncExternalStore(subscribe, readWish, () => false);
  function toggle() {
    try {
      window.localStorage.setItem(KEY, on ? "0" : "1");
    } catch {
      // Storage can be blocked. Then the button simply cannot remember.
    }
    window.dispatchEvent(new Event("careers-wish"));
  }
  return (
    <div className="mx-auto flex min-h-[70dvh] w-full max-w-md flex-col items-center justify-center gap-5 px-6 py-10 text-center">
      <Poster seed="careers" className="flex size-24 items-center justify-center rounded-[30px]">
        <span className="flex size-full items-center justify-center text-white">
          <BriefcaseIcon aria-hidden="true" className="size-9" />
        </span>
      </Poster>
      <div>
        <h1 className="font-heading text-[1.7rem] font-extrabold leading-tight tracking-tight">
          Careers is coming soon
        </h1>
        <p className="mx-auto mt-2 max-w-[32ch] text-[14.5px] leading-relaxed text-ink-muted">
          Track your applications and find internships picked for your college. We are building it
          with care.
        </p>
      </div>
      <Button size="lg" variant={on ? "secondary" : "default"} onClick={toggle} aria-pressed={on}>
        {on ? (
          <>
            <CheckIcon aria-hidden="true" /> We will remember
          </>
        ) : (
          "Notify me"
        )}
      </Button>
    </div>
  );
}
