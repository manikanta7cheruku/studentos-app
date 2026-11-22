"use client";

import * as React from "react";
import { cn } from "cn";
import { RollingNumber } from "./rolling-number";

/**
 * A number with a minus and a plus on a glass pill. The digits roll like an odometer when the number changes. Tap the number
 * to type it. Used for players, places, hours and every other small count, so they all move the same way.
 */
export function NumberStepper({
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  onChange,
  className,
  ...aria
}: {
  /** What is being counted, for screen readers and the button names: "Players". */
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  /** A short word after the number: "hours". */
  unit?: string;
  onChange: (value: number) => void;
  className?: string;
} & Omit<React.ComponentProps<"input">, "value" | "onChange" | "min" | "max" | "step" | "type">) {
  const [draft, setDraft] = React.useState<string | null>(null);
  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  const button =
    "inline-flex size-10 shrink-0 items-center justify-center rounded-full text-[18px] font-semibold leading-none text-ink-muted outline-none transition-[background-color,color,transform] duration-150 hover:bg-white/10 hover:text-ink focus-visible:ring-2 focus-visible:ring-ring active:scale-90 disabled:opacity-30";
  const name = label.toLowerCase();
  return (
    <div
      role="group"
      className={cn(
        "inline-flex h-11 w-fit items-center rounded-full border border-white/[0.13] bg-white/[0.065] px-0.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]",
        className,
      )}
    >
      <button
        type="button"
        aria-label={`Fewer, ${name}`}
        disabled={value <= min}
        onClick={() => onChange(clamp(value - step))}
        className={button}
      >
        &minus;
      </button>
      <span className="group/number relative flex h-full min-w-[3rem] items-center justify-center gap-1.5 px-2">
        <span
          aria-hidden="true"
          className="pointer-events-none flex items-center gap-1.5 text-[16px] font-semibold group-focus-within/number:opacity-0"
        >
          <RollingNumber value={value} />
          {unit ? <span className="text-[13px] font-medium text-ink-muted">{unit}</span> : null}
        </span>
        <input
          {...aria}
          inputMode="numeric"
          aria-label={aria.id ? undefined : label}
          value={draft ?? String(value)}
          onChange={(event) => {
            const digits = event.target.value.replace(/\D/g, "").slice(0, String(max).length);
            setDraft(digits);
            const typed = Number(digits);
            if (digits !== "" && typed >= min && typed <= max) onChange(typed);
          }}
          onFocus={(event) => event.target.select()}
          onBlur={() => setDraft(null)}
          className="tabular absolute inset-0 w-full bg-transparent text-center text-[16px] font-semibold text-transparent caret-ink outline-none focus:text-ink"
        />
      </span>
      <button
        type="button"
        aria-label={`More, ${name}`}
        disabled={value >= max}
        onClick={() => onChange(clamp(value + step))}
        className={button}
      >
        +
      </button>
    </div>
  );
}
