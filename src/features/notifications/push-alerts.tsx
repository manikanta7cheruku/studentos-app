"use client";

import * as React from "react";
import { BellRingIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { api } from "@/lib/api/endpoints";
import { usePush, type PushState } from "./use-push";

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
        </label>
        <Switch
          id={id}
          checked={state === "on"}
          disabled={!usable || busy}
          onCheckedChange={(value) => void (value ? enable() : disable())}
        />
      </div>
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
function writeNudge(record: NudgeRecord) {
  try {
    localStorage.setItem(NUDGE_KEY, JSON.stringify(record));
  } catch {
    // The card simply comes back sooner next time.
  }
}
function nudgeDue(): boolean {
  const { n, at } = readNudge();
  return Date.now() - at >= (GAPS[Math.min(n, GAPS.length - 1)] ?? 21 * DAY);
}

const NUDGE_TEXT: Record<"off" | "blocked" | "install", { title: string; text: string }> = {
  off: {
    title: "Never miss a message or a plan",
    text: "Turn on alerts and StudentOS lets you know when someone messages you, joins your plan or replies. You can turn them off any time.",
  },
  blocked: {
    title: "Alerts are turned off for StudentOS",
    text: "You may be missing messages and plan updates. To turn them on, open your browser's site settings for StudentOS and allow Notifications.",
  },
  install: {
    title: "Get alerts on your iPhone",
    text: "Add StudentOS to your Home Screen (Share, then Add to Home Screen) and open it from there. Then you can turn alerts on.",
  },
};

/**
 * A calm card that asks for alerts once a person is settled in the app, and comes back now and then if they said not now, or if
 * the browser blocked them. `enabled` is false while a tour, a tip or a sheet is on screen, so it never stands on top of them.
 */
export function PushNudge({ enabled }: { enabled: boolean }) {
  const { state, busy, enable } = usePush();
  const [shown, setShown] = React.useState(false);
  const wanted = state === "off" || state === "blocked" || state === "install";

  React.useEffect(() => {
    if (!enabled || !wanted || !nudgeDue()) return;
    // A moment after the page settles, so it does not fight the other tips.
    const timer = window.setTimeout(() => setShown(true), 14_000);
    return () => window.clearTimeout(timer);
  }, [enabled, wanted]);

  if (!shown || !enabled || !wanted) return null;
  const copy = NUDGE_TEXT[state as "off" | "blocked" | "install"];

  function later() {
    const { n } = readNudge();
    writeNudge({ n: n + 1, at: Date.now() });
    setShown(false);
  }
  async function turnOn() {
    await enable();
    // Whatever the answer, do not ask again straight away. When it worked the card goes away because alerts are on.
    const { n } = readNudge();
    writeNudge({ n: n + 1, at: Date.now() });
    setShown(false);
  }

  return (
    <div
      role="dialog"
      aria-label="Alerts"
      className="page-enter glass-card fixed inset-x-3 bottom-[calc(6.5rem+env(safe-area-inset-bottom))] z-40 mx-auto flex max-w-sm items-start gap-3 rounded-[22px] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.5)] md:bottom-6 md:left-auto md:right-6 md:mx-0"
    >
      <span className="bg-brand inline-flex size-10 shrink-0 items-center justify-center rounded-xl text-white [&_svg]:size-5">
        <BellRingIcon aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[14.5px] font-semibold leading-snug">{copy.title}</p>
        <p className="mt-1 text-[13px] leading-snug text-ink-muted">{copy.text}</p>
        <div className="mt-3 flex gap-2">
          {state === "off" ? (
            <Button size="sm" disabled={busy} onClick={() => void turnOn()}>
              Turn on alerts
            </Button>
          ) : null}
          <Button size="sm" variant="ghost" onClick={later}>
            {state === "off" ? "Not now" : "Got it"}
          </Button>
        </div>
      </div>
    </div>
  );
}
