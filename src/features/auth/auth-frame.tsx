import * as React from "react";
import Link from "next/link";
import { Logo } from "@/components/app/logo";
import { cn } from "cn";

type AuthFrameProps = {
  eyebrow?: string;
  title: string;
  intro?: React.ReactNode;
  /** The form or the content under the text. */
  children: React.ReactNode;
  /** A line of small print under the form. */
  footer?: React.ReactNode;
  /** The college's own mark and name, when the screen is about one college. */
  college?: { name: string; shortName: string | null; accentVars?: React.CSSProperties };
  /** Something above the title, for example the fan of plan covers on the welcome screen. */
  hero?: React.ReactNode;
  className?: string;
};

/** The StudentOS mark: a small gradient tile and the name. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 font-heading text-[1.15rem] font-extrabold tracking-tight",
        className,
      )}
    >
      <Logo size={26} />
      StudentOS
    </span>
  );
}

/**
 * The frame of every page before a person is inside a college: sign in, choose a space, join, waiting. One calm column
 * on a brand glow: the name on top, then what this step is, then the step itself. Left aligned throughout, and made for a
 * phone first (on a wide screen the column stays narrow and sits in the middle).
 */
export function AuthFrame({
  eyebrow,
  title,
  intro,
  children,
  footer,
  college,
  hero,
  className,
}: AuthFrameProps) {
  const initials = college ? (college.shortName || college.name).slice(0, 2).toUpperCase() : null;
  return (
    <div className="relative min-h-dvh overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[34rem] bg-[radial-gradient(60%_60%_at_50%_0%,rgba(111,102,214,0.28),transparent_70%)]"
      />
      <header>
        <div className="mx-auto flex h-16 max-w-md items-center justify-between px-6">
          <Link
            href="/"
            className="-ml-1 rounded-lg px-1 outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Wordmark />
          </Link>
          {college ? (
            <span className="flex min-w-0 items-center gap-2 text-[13px] font-semibold">
              <span
                aria-hidden="true"
                className="bg-brand inline-flex size-7 shrink-0 items-center justify-center rounded-lg font-heading text-[12px] font-bold text-white"
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
        className={cn("page-enter mx-auto flex max-w-md flex-col px-6 pb-12 pt-4", className)}
      >
        {hero ? <div className="mb-6">{hero}</div> : null}
        <div>
          {eyebrow ? (
            <p className="text-[11.5px] font-semibold uppercase tracking-[0.1em] text-ink-muted">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="mt-2 text-balance text-[2rem] font-extrabold leading-[1.05] tracking-tight sm:text-[2.4rem]">
            {title}
          </h1>
          {intro ? (
            <div className="mt-3 text-pretty text-[14.5px] leading-relaxed text-ink-muted">
              {intro}
            </div>
          ) : null}
        </div>
        <div className="mt-7 min-w-0">{children}</div>
        {footer ? <div className="mt-6 text-[13px] text-ink-muted">{footer}</div> : null}
      </main>
    </div>
  );
}
