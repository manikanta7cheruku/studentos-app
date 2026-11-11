"use client";

import * as React from "react";
import { cn } from "cn";

const chip =
  "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-semibold outline-none transition-[background-color,border-color,color,transform] duration-200 focus-visible:ring-2 focus-visible:ring-ring active:scale-95";
const on = "bg-brand border-transparent text-white shadow-[0_6px_16px_-8px_rgba(8,6,30,0.55)]";
const off = "border-white/10 bg-white/[0.04] text-ink-muted hover:border-white/25 hover:text-ink";

export type Choice<T extends string> = { value: T; label: string; icon?: React.ReactNode };

/** Pick one: a row of chips that works as a radio group. Easier than a dropdown, and every option is in sight. */
export function ChoiceChips<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
}: {
  options: Choice<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  className?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn("flex flex-wrap gap-2", className)}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(chip, value === option.value ? on : off)}
        >
          {option.icon}
          {option.label}
        </button>
      ))}
    </div>
  );
}

/** Pick several: chips that toggle on and off. */
export function ToggleChips({
  options,
  values,
  onToggle,
  label,
  className,
}: {
  options: Choice<string>[];
  values: string[];
  onToggle: (value: string) => void;
  label: string;
  className?: string;
}) {
  return (
    <div role="group" aria-label={label} className={cn("flex flex-wrap gap-2", className)}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={values.includes(option.value)}
          onClick={() => onToggle(option.value)}
          className={cn(chip, values.includes(option.value) ? on : off)}
        >
          {option.icon}
          {option.label}
        </button>
      ))}
    </div>
  );
}
