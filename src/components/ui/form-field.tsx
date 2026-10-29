import * as React from "react";
import { OctagonXIcon } from "lucide-react";
import { cn } from "cn";

import { Label } from "@/components/ui/label";

type FormFieldProps = {
  /** Visible label. Every input needs one. */
  label: string;
  /** Short hint shown under the label, e.g. "Use your college email". */
  help?: string;
  /** Error message in plain words. When set, the input is marked invalid. */
  error?: string;
  /** Adds the word "required" next to the label (not only a star). */
  required?: boolean;
  /** Optional id. If missing, one is created. */
  id?: string;
  className?: string;
  /** Exactly one form control: Input, Textarea, Select trigger, ... */
  children: React.ReactElement<Record<string, unknown>>;
};

function FormField({ label, help, error, required, id, className, children }: FormFieldProps) {
  const generatedId = React.useId();
  const fieldId = id ?? generatedId;
  const helpId = `${fieldId}-help`;
  const errorId = `${fieldId}-error`;

  const describedBy = [help ? helpId : null, error ? errorId : null].filter(Boolean).join(" ");

  const control = React.cloneElement(children, {
    id: fieldId,
    "aria-describedby": describedBy || undefined,
    "aria-invalid": error ? true : undefined,
    "aria-required": required ? true : undefined,
  });

  return (
    <div data-slot="form-field" className={cn("flex flex-col gap-2", className)}>
      <Label htmlFor={fieldId}>
        {label}
        {required ? <span className="font-normal text-muted-foreground">(required)</span> : null}
      </Label>
      {help ? (
        <p id={helpId} className="text-base text-muted-foreground">
          {help}
        </p>
      ) : null}
      {control}
      {error ? (
        <p id={errorId} className="flex items-start gap-2 text-base font-medium text-destructive">
          <OctagonXIcon aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  );
}

export { FormField };
