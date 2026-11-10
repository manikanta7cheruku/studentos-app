import * as React from "react";
import Link from "next/link";
import { ChevronLeftIcon } from "lucide-react";
import { cn } from "cn";

type PageHeaderProps = {
  /** Small label above the title, for example the area of the app. */
  eyebrow?: string;
  title: string;
  description?: React.ReactNode;
  /** Buttons on the right (they wrap under the title on a phone). */
  actions?: React.ReactNode;
  back?: { href: string; label: string };
  className?: string;
};

/**
 * The top of every screen: an optional way back, a small label, the title in the heading font, one sentence of help,
 * and the one main action. A thin rule under it separates the header from the content.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  back,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn("flex flex-col gap-4 border-b border-border pb-6", className)}>
      {back ? (
        <Link
          href={back.href}
          className="-ml-1 inline-flex min-h-11 w-fit items-center gap-1 rounded-input px-1 text-[13.5px] font-medium text-ink-muted transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ChevronLeftIcon aria-hidden="true" className="size-5" />
          {back.label}
        </Link>
      ) : null}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          {eyebrow ? (
            <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="mt-1 text-balance text-3xl font-semibold leading-tight tracking-tight text-ink sm:text-[2.25rem]">
            {title}
          </h1>
          {description ? (
            <p className="mt-2 max-w-prose text-pretty text-[15px] leading-relaxed text-ink-muted">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
      </div>
    </header>
  );
}
