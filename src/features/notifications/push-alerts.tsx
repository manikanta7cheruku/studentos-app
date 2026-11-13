"use client";

import * as React from "react";
import { BellRingIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { usePush, type PushState } from "./use-push";

const DISMISS_KEY = "studentos.push-prompt.dismissed";

function hint(state: PushState): string {
  switch (state) {
    case "install":
      return "On iPhone, add StudentOS to your Home Screen first (Share, then Add to Home Screen), then turn this on.";
    case "blocked":
      return "Alerts are blocked for StudentOS in your browser settings. Allow notifications there, then come back.";
    case "unsupported":
      return "This browser cannot show alerts. Try Chrome on Android or the installed app.";
    default:
      return "Messages, requests and plan updates, even when StudentOS is closed.";
  }
}

/** A row for Settings: one switch for this device. Hidden when alerts are not set up on this server. */
export function PushAlertsRow() {
  const { state, busy, error, enable, disable } = usePush();
  const id = React.useId();
  if (state === "unavailable") return null;
  const usable = state === "off" || state === "on";
  return (
    <div className="flex min-h-14 items-center justify-between gap-4 py-2.5">
      <label htmlFor={id} className="min-w-0 flex-1 text-[14px] leading-snug">
        <span className="block font-medium text-ink">Alerts on this device</span>
        <span className="block text-[13px] text-ink-muted">{error ?? hint(state)}</span>
      </label>
      <Switch
        id={id}
        checked={state === "on"}
        disabled={!usable || busy}
        onCheckedChange={(value) => void (value ? enable() : disable())}
      />
    </div>
  );
}

// The "not now" choice lives on the device. useSyncExternalStore reads it without a flash and without touching storage on the server.
const listeners = new Set<() => void>();
function subscribeDismissed(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}
function readDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

/** A quiet card on the Updates page that offers alerts once. Not shown when already on, blocked, unsupported or dismissed. */
export function PushPrompt() {
  const { state, busy, enable } = usePush();
  const dismissed = React.useSyncExternalStore(subscribeDismissed, readDismissed, () => true);
  if (dismissed || (state !== "off" && state !== "install")) return null;

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // The card simply comes back next time.
    }
    listeners.forEach((listener) => listener());
  }

  return (
    <div className="glass-card relative flex items-start gap-3 rounded-2xl p-4 pr-10">
      <span className="bg-brand inline-flex size-10 shrink-0 items-center justify-center rounded-xl text-white [&_svg]:size-5">
        <BellRingIcon aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-[14.5px] font-semibold">Get alerts on this device</p>
        <p className="mt-0.5 text-[13px] leading-snug text-ink-muted">{hint(state)}</p>
        {state === "off" ? (
          <Button size="sm" className="mt-2.5" disabled={busy} onClick={() => void enable()}>
            Turn on alerts
          </Button>
        ) : null}
      </div>
      <button
        type="button"
        aria-label="Not now"
        onClick={dismiss}
        className="absolute right-2.5 top-2.5 inline-flex size-7 items-center justify-center rounded-full text-ink-muted hover:bg-white/10 hover:text-ink"
      >
        <XIcon aria-hidden="true" className="size-4" />
      </button>
    </div>
  );
}
