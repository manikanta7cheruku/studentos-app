import * as React from "react";
import { cn } from "cn";

/**
 * One digit that rolls like an odometer: all ten digits sit in a column behind a window one digit tall, and the column slides to
 * the one to show. Only a digit that changes moves, so 2006 to 2005 rolls the last digit and leaves the rest still.
 */
export function RollingDigit({ digit }: { digit: number }) {
  return (
    <span className="relative inline-block h-[1.4em] w-[0.64em] overflow-hidden">
      <span
        className="absolute inset-x-0 top-0 flex flex-col transition-transform duration-[380ms] ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform"
        style={{ transform: `translateY(${-digit * 1.4}em)` }}
      >
        {Array.from({ length: 10 }, (_, d) => (
          <span key={d} className="block h-[1.4em] text-center leading-[1.4em]">
            {d}
          </span>
        ))}
      </span>
    </span>
  );
}

/**
 * A whole number that rolls when it changes. Each place is its own column, counted from the right, so 9 to 10 rolls the ones
 * place and brings in a new tens place. Purely visual (it is hidden from screen readers): put the real number in a field or
 * a label beside it.
 */
export function RollingNumber({ value, className }: { value: number; className?: string }) {
  const digits = String(Math.max(0, Math.trunc(value))).split("");
  return (
    <span
      aria-hidden="true"
      className={cn("tabular inline-flex select-none items-center", className)}
    >
      {digits.map((digit, index) => (
        <RollingDigit key={digits.length - index} digit={Number(digit)} />
      ))}
    </span>
  );
}
