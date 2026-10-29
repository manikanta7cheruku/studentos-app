"use client";

import * as React from "react";
import { OctagonXIcon } from "lucide-react";
import { cn } from "cn";

type ErrorSummaryItem = {
  /** The id of the field that has the problem. */
  fieldId: string;
  /** Plain-words message. Same text as the error under the field. */
  message: string;
};

type ErrorSummaryProps = Omit<React.ComponentProps<"div">, "title"> & {
  errors: ErrorSummaryItem[];
  title?: string;
};

/**
 * Shown at the top of a form after a failed submit. It takes focus so screen
 * readers read it, and each message links to the field with the problem.
 */
function ErrorSummary({
  errors,
  title = "There is a problem",
  className,
  ...props
}: ErrorSummaryProps) {
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (errors.length > 0) ref.current?.focus();
  }, [errors]);

  if (errors.length === 0) return null;

  function focusField(event: React.MouseEvent<HTMLAnchorElement>, fieldId: string) {
    const field = document.getElementById(fieldId);
    if (!field) return;
    event.preventDefault();
    field.focus();
  }

  return (
    <div
      ref={ref}
      tabIndex={-1}
      role="alert"
      data-slot="error-summary"
      className={cn(
        "flex items-start gap-3 rounded-card border-2 border-destructive bg-surface p-4 text-base text-foreground",
        className,
      )}
      {...props}
    >
      <OctagonXIcon aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-destructive" />
      <div className="flex flex-col gap-2">
        <h2 className="font-heading text-xl font-semibold">{title}</h2>
        <ul className="flex flex-col gap-1">
          {errors.map((error) => (
            <li key={error.fieldId}>
              <a
                href={`#${error.fieldId}`}
                onClick={(event) => focusField(event, error.fieldId)}
                className="font-medium text-destructive underline underline-offset-4"
              >
                {error.message}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export { ErrorSummary };
export type { ErrorSummaryItem };
