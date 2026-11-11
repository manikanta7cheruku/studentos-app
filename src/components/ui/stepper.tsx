"use client";

import * as React from "react";
import { MinusIcon, PlusIcon } from "lucide-react";
import { cn } from "cn";

/**
 * A number with a minus and a plus, for small counts (players, places). The number is a real input, so it can be typed too.
 * It takes the id and the aria props that a FormField gives it.
 */
export function Stepper({
  value,
  onChange,
  min = 1,
  max = 20,
  step = 1,
  unit,
  className,
  ...aria
}: {
  value: string;
  onChange: (value: string) => void;
  min?: number;
  max?: number;
  step?: number;
  /** A short word after the number, such as "players". */
  unit?: string;
  className?: string;
} & Omit<React.ComponentProps<"input">, "value" | "onChange" | "min" | "max" | "step">) {
  const number = Number(value);
  const set = (next: number) => onChange(String(Math.min(max, Math.max(min, next))));
  const button =
    "inline-flex size-9 items-center justify-center rounded-full text-ink-muted outline-none transition-[background-color,color,transform] duration-150 hover:bg-white/10 hover:text-ink focus-visible:ring-2 focus-visible:ring-ring active:scale-90 disabled:opacity-40";
  return (
    <div
      className={cn(
        "inline-flex h-11 w-fit items-center gap-1 self-start rounded-[12px] border border-white/10 bg-white/[0.045] px-1.5",
        className,
      )}
    >
      <button
        type="button"
        aria-label="One less"
        disabled={!(number > min)}
        onClick={() => set((Number.isFinite(number) ? number : min) - step)}
        className={button}
      >
        <MinusIcon aria-hidden="true" className="size-4" />
      </button>
      <input
        {...aria}
        inputMode="numeric"
        value={value}
        onChange={(event) => onChange(event.target.value.replace(/\D/g, "").slice(0, 3))}
        className="tabular h-9 w-12 bg-transparent text-center text-[15px] font-semibold outline-none"
      />
      {unit ? <span className="pr-1 text-[13px] text-ink-muted">{unit}</span> : null}
      <button
        type="button"
        aria-label="One more"
        disabled={!(number < max)}
        onClick={() => set((Number.isFinite(number) ? number : min - step) + step)}
        className={button}
      >
        <PlusIcon aria-hidden="true" className="size-4" />
      </button>
    </div>
  );
}
