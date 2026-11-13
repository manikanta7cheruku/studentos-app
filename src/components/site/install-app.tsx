"use client";

import * as React from "react";
import {
  CheckIcon,
  DownloadIcon,
  EllipsisVerticalIcon,
  PlusSquareIcon,
  ShareIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// "Download the app" without a store: StudentOS is installed from the browser and then lives on the home screen like any app,
// full screen with its own icon. Android and desktop Chrome/Edge offer a real install prompt; iPhone and iPad need
// Share, then Add to Home Screen, so we show the two steps.

type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

let deferred: InstallPrompt | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferred = event as InstallPrompt;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    notify();
  });
}

const subscribe = (callback: () => void) => {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
};

function isInstalled(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

type Kind = "installed" | "prompt" | "ios" | "other";
function readKind(): Kind {
  if (isInstalled()) return "installed";
  if (deferred) return "prompt";
  const ua = navigator.userAgent;
  const ios =
    /iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
  return ios ? "ios" : "other";
}

/** The StudentOS service worker is what lets browsers treat the site as an installable app. */
function registerWorker() {
  if (process.env.NEXT_PUBLIC_API_MOCKING === "enabled") return;
  if ("serviceWorker" in navigator)
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => undefined);
}

export function InstallApp({
  size = "lg",
  variant = "outline",
  className = "",
  label = "Add to your phone",
}: {
  size?: "sm" | "lg";
  variant?: "outline" | "default" | "secondary";
  className?: string;
  label?: string;
}) {
  const kind = React.useSyncExternalStore(subscribe, readKind, () => "other" as Kind);
  const [help, setHelp] = React.useState(false);

  React.useEffect(registerWorker, []);

  async function click() {
    if (kind === "prompt" && deferred) {
      const prompt = deferred;
      deferred = null;
      notify();
      await prompt.prompt();
      await prompt.userChoice.catch(() => undefined);
      return;
    }
    setHelp(true);
  }

  if (kind === "installed") {
    return (
      <span className={`inline-flex items-center gap-2 text-[14px] text-ink-muted ${className}`}>
        <CheckIcon aria-hidden="true" className="size-4" /> You are using the app
      </span>
    );
  }

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        onClick={() => void click()}
      >
        <DownloadIcon aria-hidden="true" /> {label}
      </Button>
      <Dialog open={help} onOpenChange={setHelp}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add StudentOS to your phone</DialogTitle>
            <DialogDescription>
              It is free, takes a few seconds and needs no app store. It opens full screen with its
              own icon.
            </DialogDescription>
          </DialogHeader>
          {kind === "ios" ? (
            <ol className="flex flex-col gap-3 text-[15px]">
              <li className="flex items-start gap-3">
                <ShareIcon aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-ink-muted" />
                <span>
                  Open this page in <b>Safari</b> and tap <b>Share</b> at the bottom of the screen.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <PlusSquareIcon
                  aria-hidden="true"
                  className="mt-0.5 size-5 shrink-0 text-ink-muted"
                />
                <span>
                  Choose <b>Add to Home Screen</b>, then tap <b>Add</b>.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckIcon aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-ink-muted" />
                <span>Open StudentOS from your home screen. Turn on alerts there too.</span>
              </li>
            </ol>
          ) : (
            <ol className="flex flex-col gap-3 text-[15px]">
              <li className="flex items-start gap-3">
                <EllipsisVerticalIcon
                  aria-hidden="true"
                  className="mt-0.5 size-5 shrink-0 text-ink-muted"
                />
                <span>
                  In <b>Chrome</b> or <b>Edge</b>, open the browser menu.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <DownloadIcon
                  aria-hidden="true"
                  className="mt-0.5 size-5 shrink-0 text-ink-muted"
                />
                <span>
                  Tap <b>Install app</b> (or <b>Add to Home screen</b>).
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckIcon aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-ink-muted" />
                <span>Open StudentOS from your home screen or app list.</span>
              </li>
            </ol>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
