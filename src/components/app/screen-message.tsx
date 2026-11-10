import * as React from "react";
import { cn } from "cn";

type ScreenMessageProps = {
  /** A short label above the title, for example "Error 404" or "Offline". */
  eyebrow?: string;
  title: string;
  children?: React.ReactNode;
  /** Buttons or links. The first one is the main way forward. */
  actions?: React.ReactNode;
  /** The code of the request that failed, so a person can quote it to support. */
  requestId?: string;
  className?: string;
};

/**
 * One calm message for a whole screen: not found, offline, no access. It is left aligned on a narrow column (like the
 * rest of the app), says what happened in plain words, and offers one way forward.
 */
export function ScreenMessage({
  eyebrow,
  title,
  children,
  actions,
  requestId,
  className,
}: ScreenMessageProps) {
  return (
    <div
      className={cn("mx-auto flex w-full max-w-xl flex-col gap-4 px-5 py-16 sm:py-24", className)}
    >
      {eyebrow ? (
        <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
          {eyebrow}
        </p>
      ) : null}
      <h1 className="text-balance text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
        {title}
      </h1>
      {children ? (
        <div className="text-pretty text-[15px] leading-relaxed text-ink-muted">{children}</div>
      ) : null}
      {actions ? <div className="mt-2 flex flex-wrap items-center gap-3">{actions}</div> : null}
      {requestId ? (
        <p className="mt-4 text-sm text-ink-muted">
          If this keeps happening, tell us this code:{" "}
          <code className="rounded bg-border/60 px-1.5 py-0.5 font-mono text-[12px] text-ink">
            {requestId}
          </code>
        </p>
      ) : null}
    </div>
  );
}
