"use client";

import * as React from "react";
import { XIcon } from "lucide-react";
import { cn } from "cn";

/**
 * A small glass tip that points at something. It springs in, shows a thin line that runs out as it counts down, and leaves by
 * itself (or when tapped, or by its close button). Holding a finger or the pointer on it pauses the countdown, so it is never
 * taken away mid-read. `placement` says where the pointer sits: the tip is below its target (`below`) or above it (`above`).
 */
export function GlassTip({
  title,
  text,
  onClose,
  placement,
  seconds = 7,
  className,
}: {
  title: string;
  text: string;
  onClose: () => void;
  placement: "above" | "below";
  seconds?: number;
  className?: string;
}) {
  const [leaving, setLeaving] = React.useState(false);
  const timer = React.useRef<number | null>(null);

  function close() {
    if (leaving) return;
    setLeaving(true);
    timer.current = window.setTimeout(onClose, 220);
  }
  React.useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "glass-tip group fixed z-40 w-[15.5rem] max-w-[calc(100vw-1.5rem)] rounded-[20px]",
        leaving ? "glass-tip-out" : "glass-tip-in",
        className,
      )}
    >
      <button
        type="button"
        onClick={close}
        className="block w-full rounded-[20px] px-4 pb-5 pt-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="block pr-6 text-[13.5px] font-semibold leading-tight">{title}</span>
        <span className="mt-1 block text-[12.5px] leading-snug text-ink-muted">{text}</span>
      </button>
      <button
        type="button"
        onClick={close}
        aria-label="Close tip"
        className="absolute right-2 top-2 inline-flex size-7 items-center justify-center rounded-full text-ink-muted outline-none transition-colors hover:bg-white/10 hover:text-ink focus-visible:ring-2 focus-visible:ring-ring"
      >
        <XIcon aria-hidden="true" className="size-3.5" />
      </button>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-4 bottom-1.5 h-[2px] overflow-hidden rounded-full bg-white/10"
      >
        <span
          className="glass-tip-line block h-full origin-left rounded-full bg-white/45 group-hover:[animation-play-state:paused] group-active:[animation-play-state:paused]"
          style={{ animationDuration: `${seconds}s` }}
          onAnimationEnd={close}
        />
      </span>
      <span
        aria-hidden="true"
        className={cn(
          "glass-tip-notch absolute right-5 size-3 rotate-45",
          placement === "above" ? "-bottom-1.5 border-b border-r" : "-top-1.5 border-l border-t",
        )}
      />
    </div>
  );
}
