"use client";

import * as React from "react";
import { cn } from "cn";

/**
 * A row of tabs with one highlight that glides to the chosen tab. The highlight takes the real size and place of the tab, so it
 * always covers its own label and nothing more, whatever the labels are.
 */
export function GlideTabs<T extends string>({
  tabs,
  value,
  onChange,
  label,
  className,
}: {
  tabs: { value: T; label: React.ReactNode }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  className?: string;
}) {
  const list = React.useRef<HTMLDivElement>(null);
  const [thumb, setThumb] = React.useState({ left: 0, width: 0 });
  const signature = tabs.map((tab) => tab.value).join("|");

  React.useEffect(() => {
    const el = list.current;
    if (!el) return;
    const measure = () => {
      const chosen = el.querySelector<HTMLElement>('[aria-selected="true"]');
      if (chosen) setThumb({ left: chosen.offsetLeft, width: chosen.offsetWidth });
    };
    const frame = window.requestAnimationFrame(measure);
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [value, signature]);

  function onKeyDown(event: React.KeyboardEvent) {
    const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const index = tabs.findIndex((tab) => tab.value === value);
    const next = tabs[(index + step + tabs.length) % tabs.length]!;
    onChange(next.value);
    (
      event.currentTarget.querySelector(`[data-tab="${next.value}"]`) as HTMLElement | null
    )?.focus();
  }

  return (
    <div
      ref={list}
      role="tablist"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={cn(
        "no-scrollbar relative flex overflow-x-auto rounded-full border border-white/10 bg-white/[0.04] p-1",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="absolute inset-y-1 left-0 rounded-full bg-white/[0.16] shadow-[inset_0_1px_0_rgba(255,255,255,0.14)] transition-[transform,width] duration-[380ms] ease-[cubic-bezier(0.3,1.2,0.4,1)] motion-reduce:transition-none"
        style={{
          width: thumb.width,
          transform: `translateX(${thumb.left}px)`,
          opacity: thumb.width ? 1 : 0,
        }}
      />
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          role="tab"
          data-tab={tab.value}
          tabIndex={value === tab.value ? 0 : -1}
          aria-selected={value === tab.value}
          onClick={() => onChange(tab.value)}
          className={cn(
            "relative z-10 h-9 flex-1 whitespace-nowrap rounded-full px-4 text-[13.5px] font-semibold outline-none transition-colors duration-300 focus-visible:ring-2 focus-visible:ring-ring",
            value === tab.value ? "text-ink" : "text-ink-muted hover:text-ink",
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
