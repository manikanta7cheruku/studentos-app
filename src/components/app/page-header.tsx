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
  /** A "..." menu (report, block) on the right of the back link. */
  menu?: React.ReactNode;
  className?: string;
  /** A main tab of the app: a bigger title, no long text and no big button on a phone (the + and the dock do that). */
  app?: boolean;
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
  menu,
  className,
  app = false,
}: PageHeaderProps) {
  return (
    <header className={cn("flex flex-col gap-4 pb-2", app && "gap-2 pb-0", className)}>
      {back || menu ? (
        <div className="flex items-center justify-between gap-2">
          {back ? (
            <Link
              href={back.href}
              className="group -ml-1 inline-flex h-10 w-fit items-center gap-1 rounded-input px-1 text-[13.5px] font-medium text-ink-muted transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ChevronLeftIcon
                aria-hidden="true"
                className="size-5 transition-transform duration-200 group-hover:-translate-x-0.5"
              />
              {back.label}
            </Link>
          ) : (
            <span />
          )}
          {menu}
        </div>
      ) : null}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          {eyebrow ? (
            <p
              className={cn(
                "text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-muted",
                app && "text-[11px]",
              )}
            >
              {eyebrow}
            </p>
          ) : null}
          <h1
            className={cn(
              "mt-0.5 text-balance font-extrabold leading-tight tracking-tight text-ink sm:text-[1.9rem]",
              app ? "text-[1.6rem]" : "text-[1.5rem]",
            )}
          >
            {title}
          </h1>
          {description ? (
            <p
              className={cn(
                "mt-2 max-w-prose text-pretty text-[14.5px] leading-relaxed text-ink-muted",
                app && "hidden sm:block",
              )}
            >
              {description}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div className={cn("flex flex-wrap items-center gap-3", app && "hidden sm:flex")}>
            {actions}
          </div>
        ) : null}
      </div>
    </header>
  );
}
