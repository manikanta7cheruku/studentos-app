"use client";

import * as React from "react";
import { Checkbox as CheckboxPrimitive } from "radix-ui";
import { CheckIcon, OctagonXIcon } from "lucide-react";
import { cn } from "cn";

function Checkbox({ className, ...props }: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer flex size-6 shrink-0 items-center justify-center rounded-input border-2 border-border-strong bg-surface text-primary-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-primary data-[state=checked]:bg-primary aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator>
        <CheckIcon aria-hidden="true" className="size-4" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

type CheckboxFieldProps = Omit<React.ComponentProps<typeof CheckboxPrimitive.Root>, "children"> & {
  label: React.ReactNode;
  error?: string;
};

/** Checkbox + clickable label in a row at least 44px high. Use for consent boxes. */
function CheckboxField({ label, error, id, className, ...props }: CheckboxFieldProps) {
  const generatedId = React.useId();
  const fieldId = id ?? generatedId;
  const errorId = `${fieldId}-error`;

  return (
    <div data-slot="checkbox-field" className={cn("flex flex-col gap-2", className)}>
      <div className="flex min-h-11 items-start gap-3">
        <Checkbox
          id={fieldId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className="mt-2.5"
          {...props}
        />
        <label htmlFor={fieldId} className="py-2.5 text-base leading-snug text-foreground">
          {label}
        </label>
      </div>
      {error ? (
        <p id={errorId} className="flex items-start gap-2 text-base font-medium text-destructive">
          <OctagonXIcon aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
          <span>
            <span className="sr-only">Error: </span>
            {error}
          </span>
        </p>
      ) : null}
    </div>
  );
}

export { Checkbox, CheckboxField };
