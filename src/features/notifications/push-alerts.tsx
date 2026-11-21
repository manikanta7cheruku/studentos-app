"use client";

import * as React from "react";
import { BellRingIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { api } from "@/lib/api/endpoints";
import { AlertsHelp } from "./alerts-help";
import { usePush, type PushState } from "./use-push";

function hint(state: PushState): string {
  switch (state) {
    case "install":
      return "On iPhone, alerts work after StudentOS is added to your Home Screen.";
    case "blocked":
      return "Alerts are blocked for StudentOS on this device.";
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
  const [helpOpen, setHelpOpen] = React.useState(false);
  const [testing, setTesting] = React.useState(false);
  const [testNote, setTestNote] = React.useState<string | null>(null);
  if (state === "unavailable") return null;

  async function sendTest() {
    setTesting(true);
    setTestNote(null);
    try {
      const { sent } = await api.push.test();
      setTestNote(
        sent > 0
          ? "Sent. It should appear on your phone in a few seconds."
          : "No device received it. Turn alerts off and on again.",
      );
    } catch {
      setTestNote("We could not send it. Please try again.");
    } finally {
      setTesting(false);
    }
  }
  const usable = state === "off" || state === "on";
  return (
    <>
      <div className="flex min-h-14 items-center justify-between gap-4 py-2.5">
        <label htmlFor={id} className="min-w-0 flex-1 text-[14px] leading-snug">
          <span className="block font-medium text-ink">Alerts on this device</span>
          <span className="block text-[13px] text-ink-muted">{error ?? hint(state)}</span>
          {state === "blocked" || state === "install" ? (
            <button
              type="button"
              onClick={() => setHelpOpen(true)}
              className="mt-1.5 text-[13px] font-medium text-ink underline underline-offset-4"
            >
              Show me how
            </button>
          ) : null}
        </label>
        <Switch
          id={id}
          checked={state === "on"}
          disabled={!usable || busy}
          onCheckedChange={(value) => void (value ? enable() : disable())}
        />
      </div>
      <AlertsHelp open={helpOpen} onOpenChange={setHelpOpen} state={state} retry={enable} />
      {state === "on" ? (
        <div className="flex items-center justify-between gap-4 border-t border-white/[0.07] py-2.5">
          <span className="min-w-0 flex-1 text-[13px] text-ink-muted">
            {testNote ?? "Check that alerts reach this phone."}
          </span>
          <Button size="sm" variant="outline" disabled={testing} onClick={() => void sendTest()}>
            {testing ? "Sending" : "Send test alert"}
          </Button>
        </div>
      ) : null}
    </>
  );
}

// How often we ask again after a "Not now" (or after the browser said no): the first time right after sign in, then 2, 5, 10 and
// 21 days later, and every 21 days after that. Stops for good once alerts are on. Kept on this device.
const NUDGE_KEY = "studentos.push-nudge.v1";
const DAY = 86_400_000;
const GAPS = [0, 2 * DAY, 5 * DAY, 10 * DAY, 21 * DAY];

type NudgeRecord = { n: number; at: number };
function readNudge(): NudgeRecord {
  try {
    const raw = JSON.parse(localStorage.getItem(NUDGE_KEY) ?? "null") as NudgeRecord | null;
    if (raw && typeof raw.n === "number" && typeof raw.at === "number") return raw;
  } catch {
    // Unreadable: treat as never asked.
  }
  return { n: 0, at: 0 };
}
const nudgeListeners = new Set<() => void>();
function subscribeNudge(listener: () => void) {
  nudgeListeners.add(listener);
  return () => nudgeListeners.delete(listener);
}
function writeNudge(record: NudgeRecord) {
  try {
    localStorage.setItem(NUDGE_KEY, JSON.stringify(record));
  } catch {
    // The card simply comes back sooner next time.
  }
  nudgeListeners.forEach((listener) => listener());
}
function nudgeDue(): boolean {
  const { n, at } = readNudge();
  return Date.now() - at >= (GAPS[Math.min(n, GAPS.length - 1)] ?? 21 * DAY);
}

const BANNER_TEXT: Record<"off" | "blocked" | "install", { title: string; text: string }> = {
  off: {
    title: "Turn on alerts",
    text: "Know when someone messages you or answers your plan, even when the app is closed.",
  },
  blocked: {
    title: "Alerts are blocked",
    text: "You will miss messages and replies. It takes a moment to allow them again.",
  },
  install: {
    title: "Add StudentOS to your Home Screen",
    text: "On iPhone, alerts work once the app is on your Home Screen.",
  },
};

/**
 * A calm card on Home that asks for alerts, in the same place and style as "Finish your profile". It never pops up over the
 * screen. "Not now" hides it and it comes back after a few days (2, 5, 10, then every 21), and it goes away for good once alerts
 * are on. The switch for this device is always in Settings.
 */
export function AlertsBanner() {
  const { state, busy, enable } = usePush();
  // Read on the device only: on the server the card stays hidden, so the server and the first paint agree.
  const due = React.useSyncExternalStore(subscribeNudge, nudgeDue, () => false);
  const [helpOpen, setHelpOpen] = React.useState(false);
  const wanted = state === "off" || state === "blocked" || state === "install";

  if (!wanted || !(due || helpOpen)) return null;
  const copy = BANNER_TEXT[state as "off" | "blocked" | "install"];

  function later() {
    const { n } = readNudge();
    writeNudge({ n: n + 1, at: Date.now() });
  }
  async function turnOn() {
    await enable();
    // Whatever the answer, do not ask again straight away. When it worked the card goes away because alerts are on.
    later();
  }

  return (
    <>
      <AlertsHelp
        open={helpOpen}
        onOpenChange={(next) => {
          setHelpOpen(next);
          if (!next) later();
        }}
        state={state}
        retry={enable}
      />
      <section
        aria-label="Alerts"
        className="glass-card relative flex items-center gap-3.5 rounded-[22px] py-3.5 pl-4 pr-2.5"
      >
        <span
          aria-hidden="true"
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-[14px] border border-white/[0.14] bg-white/[0.07] text-ink/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]"
        >
          <BellRingIcon className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[14.5px] font-bold leading-snug">{copy.title}</p>
          <p className="text-[12.5px] leading-snug text-ink-muted">{copy.text}</p>
          <button
            type="button"
            disabled={busy}
            onClick={() => (state === "off" ? void turnOn() : setHelpOpen(true))}
            className="profile-btn profile-btn-primary mt-2.5 !h-8 !px-4 !text-[12.5px]"
          >
            {state === "off" ? "Turn on" : "Show me how"}
          </button>
        </div>
        <button
          type="button"
          aria-label="Not now"
          onClick={later}
          className="inline-flex size-9 shrink-0 items-center justify-center self-start rounded-full text-ink-muted outline-none transition-colors hover:bg-white/[0.08] hover:text-ink focus-visible:ring-2 focus-visible:ring-ring"
        >
          <XIcon aria-hidden="true" className="size-4" />
        </button>
      </section>
    </>
  );
}
