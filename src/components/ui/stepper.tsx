"use client";

import * as React from "react";
import { NumberStepper } from "@/components/app/number-stepper";

/**
 * A number with a minus and a plus, for small counts (players, places). The digits roll when it changes and the number can be
 * typed too. It takes the id and the aria props that a FormField gives it. The value is text, like the other form fields.
 */
export function Stepper({
  value,
  onChange,
  min = 1,
  max = 20,
  step = 1,
  unit,
  label = "Number",
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
  /** What is being counted, for the button names. */
  label?: string;
  className?: string;
} & Omit<React.ComponentProps<"input">, "value" | "onChange" | "min" | "max" | "step">) {
  const number = Number(value);
  return (
    <NumberStepper
      {...aria}
      label={label}
      value={Number.isFinite(number) && value !== "" ? number : min}
      min={min}
      max={max}
      step={step}
      unit={unit}
      onChange={(next) => onChange(String(next))}
      className={className}
    />
  );
}
