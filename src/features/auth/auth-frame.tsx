import * as React from "react";
import Link from "next/link";
import { cn } from "cn";

type AuthFrameProps = {
  eyebrow?: string;
  title: string;
  intro?: React.ReactNode;
  /** The form or the content on the right (below the text on a phone). */
  children: React.ReactNode;
  /** A line of small print under the form. */
  footer?: React.ReactNode;
  /** The college's own mark and name, when the screen is about one college. */
  college?: { name: string; shortName: string | null; accentVars?: React.CSSProperties };
  className?: string;
};

/**
 * The frame of every page before a person is inside a college: sign in, join, waiting. A plain top bar with the
 * StudentOS name, then two columns on a wide screen (what this step is, and the step itself) and one column on a
 * phone. Left aligned throughout.
 */
export function AuthFrame({
  eyebrow,
  title,
  intro,
  children,
  footer,
  college,
  className,
}: AuthFrameProps) {
  const initials = college ? (college.shortName || college.name).slice(0, 2).toUpperCase() : null;
  return (
    <div className="min-h-dvh bg-bg" style={college?.accentVars}>
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-5 md:px-8">
          <Link
            href="/"
            className="-ml-1 inline-flex min-h-11 items-center rounded-input px-1 font-heading text-xl font-semibold tracking-tight text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            StudentOS
          </Link>
          {college ? (
            <span className="flex min-w-0 items-center gap-2.5 text-[13.5px] font-medium text-ink">
              <span
                aria-hidden="true"
                className="inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-primary font-heading text-[13px] font-bold text-primary-foreground"
              >
                {initials}
              </span>
              <span className="truncate">{college.name}</span>
            </span>
          ) : null}
        </div>
      </header>
      <main
        id="main"
        className={cn(
          "mx-auto grid max-w-5xl gap-10 px-5 py-10 md:px-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-16 lg:py-20",
          className,
        )}
      >
        <div className="max-w-md">
          {eyebrow ? (
            <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="mt-2 text-balance text-[2rem] font-semibold leading-[1.15] tracking-tight text-ink sm:text-[2.5rem]">
            {title}
          </h1>
          {intro ? (
            <div className="mt-4 text-pretty text-[15px] leading-relaxed text-ink-muted">
              {intro}
            </div>
          ) : null}
        </div>
        <div className="min-w-0 max-w-md">
          {children}
          {footer ? <div className="mt-6 text-[13.5px] text-ink-muted">{footer}</div> : null}
        </div>
      </main>
    </div>
  );
}
