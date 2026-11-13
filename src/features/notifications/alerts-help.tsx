"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { PushState } from "./use-push";

type Platform = "android" | "ios" | "desktop";
function platform(): Platform {
  const ua = navigator.userAgent;
  if (/iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1))
    return "ios";
  if (/android/i.test(ua)) return "android";
  return "desktop";
}
function installed(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function stepsFor(state: PushState): { title: string; steps: string[] } {
  const where = platform();
  if (state === "install") {
    return {
      title: "Add StudentOS to your Home Screen",
      steps: [
        "Open this page in Safari and tap the Share button.",
        "Choose Add to Home Screen, then tap Add.",
        "Open StudentOS from your Home Screen and turn on alerts there.",
      ],
    };
  }
  if (where === "ios") {
    return {
      title: "Allow alerts on your iPhone",
      steps: [
        "Open the Settings app and tap Notifications.",
        "Find StudentOS in the list and tap it.",
        "Turn on Allow Notifications, then come back here.",
      ],
    };
  }
  if (where === "android") {
    return installed()
      ? {
          title: "Allow alerts on your phone",
          steps: [
            "Press and hold the StudentOS icon on your home screen and tap App info.",
            "Tap Notifications and turn on Allow notifications.",
            "Come back here and tap the button below.",
          ],
        }
      : {
          title: "Allow alerts in Chrome",
          steps: [
            "Tap the icon at the left of the address bar (a lock or sliders).",
            "Tap Permissions, then Notifications, and choose Allow.",
            "Come back here and tap the button below.",
          ],
        };
  }
  return {
    title: "Allow alerts in your browser",
    steps: [
      "Click the icon at the left of the address bar (a lock or sliders).",
      "Set Notifications to Allow.",
      "Come back here and click the button below.",
    ],
  };
}

/**
 * Browsers do not let a site ask again after a person said no, so we show exactly where to allow alerts, on their own device,
 * and a button that tries again as soon as they have done it.
 */
export function AlertsHelp({
  open,
  onOpenChange,
  state,
  retry,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  state: PushState;
  retry: () => Promise<boolean>;
}) {
  const [checking, setChecking] = React.useState(false);
  const [note, setNote] = React.useState<string | null>(null);
  const { title, steps } = open ? stepsFor(state) : { title: "", steps: [] as string[] };

  async function check() {
    setChecking(true);
    setNote(null);
    const worked = await retry();
    setChecking(false);
    if (worked) onOpenChange(false);
    else setNote("Alerts are still off. Please check the setting and try again.");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            It takes about ten seconds. You can change it any time.
          </DialogDescription>
        </DialogHeader>
        <ol className="flex flex-col gap-3 text-[15px]">
          {steps.map((step, index) => (
            <li key={step} className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-[12px] font-semibold tabular-nums">
                {index + 1}
              </span>
              <span className="leading-snug">{step}</span>
            </li>
          ))}
        </ol>
        {state !== "install" ? (
          <>
            <Button disabled={checking} onClick={() => void check()}>
              {checking ? "Checking" : "I have allowed it, turn on alerts"}
            </Button>
            {note ? (
              <p role="status" className="text-[13px] text-ink-muted">
                {note}
              </p>
            ) : null}
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
