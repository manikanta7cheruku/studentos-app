"use client";

import * as React from "react";
import { cn } from "cn";

type OtpInputProps = {
  /** The digits typed so far. */
  value: string;
  onChange: (value: string) => void;
  /** Called once when all digits are filled (typed or pasted). */
  onComplete?: (value: string) => void;
  length?: number;
  disabled?: boolean;
  invalid?: boolean;
  /** The id of the text that describes the field (the error or the help). */
  describedBy?: string;
  /** Accessible name of the whole group. */
  label: string;
  autoFocus?: boolean;
};

/**
 * Boxes for a code from an email. Typing moves on, backspace moves back, pasting fills every box, and phones
 * offer the code from the mail (autoComplete="one-time-code"). Behind the boxes is ONE input, so screen readers see a
 * single field and password managers and the mail suggestion work.
 */
export function OtpInput({
  value,
  onChange,
  onComplete,
  length = 6,
  disabled,
  invalid,
  describedBy,
  label,
  autoFocus,
}: OtpInputProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [focused, setFocused] = React.useState(false);

  React.useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  function handle(next: string) {
    const digits = next.replace(/\D/g, "").slice(0, length);
    onChange(digits);
    if (digits.length === length) onComplete?.(digits);
  }

  const active = Math.min(value.length, length - 1);

  return (
    <div className="relative w-full max-w-full" onClick={() => inputRef.current?.focus()}>
      <input
        ref={inputRef}
        value={value}
        onChange={(event) => handle(event.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="one-time-code"
        maxLength={length}
        disabled={disabled}
        aria-label={label}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        spellCheck={false}
        className="absolute inset-0 z-10 h-full w-full cursor-text opacity-0"
      />
      <div
        aria-hidden="true"
        className="grid gap-2 sm:gap-2.5"
        style={{ gridTemplateColumns: `repeat(${length}, minmax(0, 1fr))` }}
      >
        {Array.from({ length }, (_, index) => {
          const char = value[index];
          const isActive = focused && index === active;
          return (
            <div
              key={index}
              className={cn(
                "tabular flex h-14 items-center justify-center rounded-xl border bg-white/[0.04] font-heading text-xl font-bold text-ink transition-[border-color,box-shadow,background-color] duration-200 sm:text-2xl",
                invalid ? "border-destructive" : "border-white/[0.15]",
                isActive && "border-[#8a6bff] bg-white/[0.07] ring-4 ring-[#8a6bff]/20",
                disabled && "opacity-50",
              )}
            >
              {char ??
                (isActive ? (
                  <span className="h-6 w-px animate-pulse bg-ink motion-reduce:animate-none" />
                ) : null)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
