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

const NUDGE_TEXT: Record<"off" | "blocked" | "install", string> = {
  off: "Get alerts for messages and plans",
  blocked: "Alerts are blocked on this device.",
  install: "Add StudentOS to your Home Screen for alerts.",
};

/**
 * A slim bar that asks for alerts once a person is settled in the app, and comes back now and then if they said not now, or if
 * the browser blocked them. `enabled` is false while a tour, a tip or a sheet is on screen, so it never stands on top of them.
 */
export function PushNudge({ enabled }: { enabled: boolean }) {
  const { state, busy, enable } = usePush();
  const [shown, setShown] = React.useState(false);
  const [helpOpen, setHelpOpen] = React.useState(false);
  const wanted = state === "off" || state === "blocked" || state === "install";

  React.useEffect(() => {
    if (!enabled || !wanted || !nudgeDue()) return;
    // A moment after the page settles, so it does not fight the other tips.
    const timer = window.setTimeout(() => setShown(true), 14_000);
    return () => window.clearTimeout(timer);
  }, [enabled, wanted]);

  if (!(shown || helpOpen) || !enabled || !wanted) return null;
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
      <div
        role="dialog"
        aria-label="Alerts"
        className="page-enter glass-card fixed inset-x-3 bottom-[calc(6.5rem+env(safe-area-inset-bottom))] z-40 mx-auto flex max-w-sm items-center gap-2.5 rounded-full py-2 pl-3.5 pr-2 shadow-[0_10px_30px_rgba(0,0,0,0.45)] md:bottom-6 md:left-auto md:right-6 md:mx-0"
      >
        <BellRingIcon aria-hidden="true" className="size-4 shrink-0 text-ink-muted" />
        <p className="min-w-0 flex-1 text-[13px] leading-snug">{copy}</p>
        {state === "off" ? (
          <Button
            size="sm"
            className="h-8 rounded-full px-3.5 text-[12.5px]"
            disabled={busy}
            onClick={() => void turnOn()}
          >
            Turn on
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="h-8 rounded-full px-3.5 text-[12.5px]"
            onClick={() => setHelpOpen(true)}
          >
            Show me how
          </Button>
        )}
        <button
          type="button"
          aria-label={state === "off" ? "Not now" : "Got it"}
          onClick={later}
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-white/10 hover:text-ink"
        >
          <XIcon aria-hidden="true" className="size-4" />
        </button>
      </div>
    </>
  );
}
