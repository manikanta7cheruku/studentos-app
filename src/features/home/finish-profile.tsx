"use client";

import * as React from "react";
import Link from "next/link";
import { SparklesIcon, XIcon } from "lucide-react";
import { useCollege } from "@/features/college";

const KEY = "studentos.finish-profile.dismissed";
const listeners = new Set<() => void>();
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * A small first-run nudge on Home: add a few skills so classmates can find you, and finish the profile.
 * It can be dismissed, and it stays away afterwards (remembered on this device only).
 */
export function FinishProfile() {
  const { slug } = useCollege();
  // Read on the device only. On the server (and when storage is blocked) the card stays hidden.
  const stored = React.useSyncExternalStore(
    subscribe,
    () => {
      try {
        return window.localStorage.getItem(KEY) === "1" ? "1" : "0";
      } catch {
        return "0";
      }
    },
    () => "1",
  );
  const hidden = stored === "1";
  if (hidden) return null;
  return (
    <section
      aria-label="Make it yours"
      className="glass-card relative flex items-center gap-3.5 rounded-[22px] p-4"
    >
      <span className="bg-brand inline-flex size-11 shrink-0 items-center justify-center rounded-[14px] text-white">
        <SparklesIcon aria-hidden="true" className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[14.5px] font-bold leading-snug">Make it yours</p>
        <p className="text-[13px] text-ink-muted">
          Add your strengths so people can find you for their plans.{" "}
          <Link
            href={`/c/${slug}/me/skills`}
            className="font-semibold text-[#b9b4ee] underline-offset-4 hover:underline"
          >
            Add strengths
          </Link>
        </p>
      </div>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => {
          try {
            window.localStorage.setItem(KEY, "1");
          } catch {
            // Not remembered. It will show again next time, which is harmless.
          }
          listeners.forEach((listener) => listener());
        }}
        className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-ink-muted outline-none transition-colors hover:bg-white/[0.08] hover:text-ink focus-visible:ring-2 focus-visible:ring-ring"
      >
        <XIcon aria-hidden="true" className="size-4" />
      </button>
    </section>
  );
}
