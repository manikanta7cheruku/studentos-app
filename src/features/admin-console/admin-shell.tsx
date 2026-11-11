"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { ScreenMessage } from "@/components/app/screen-message";
import { homePath } from "@/lib/home-path";
import { useCollege } from "@/features/college";

type Tab = { href: string; label: string; adminOnly: boolean };

const TABS: Tab[] = [
  { href: "", label: "Overview", adminOnly: false },
  { href: "/verification", label: "Join requests", adminOnly: true },
  { href: "/members", label: "Members", adminOnly: true },
  { href: "/invites", label: "Invite codes", adminOnly: true },
  { href: "/announcements", label: "Announcements", adminOnly: false },
  { href: "/opportunities", label: "Opportunities", adminOnly: false },
  { href: "/content", label: "Content", adminOnly: false },
  { href: "/reports", label: "Reports", adminOnly: false },
  { href: "/settings", label: "Settings", adminOnly: true },
  { href: "/audit", label: "Audit log", adminOnly: true },
];

/** Who may open the console: college admins (everything) and moderators (announcements, opportunities, reports). */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const { slug, isModerator, membership } = useCollege();
  const pathname = usePathname();
  const isAdmin = membership.role === "college_admin";
  const base = `/c/${slug}/admin`;

  if (!isModerator) {
    return (
      <ScreenMessage
        eyebrow="Admin"
        title="This area is for college admins and moderators."
        actions={
          <Button asChild>
            <Link href={homePath(slug)}>Back to your college</Link>
          </Button>
        }
      >
        If you should have access, ask an admin of your college to change your role.
      </ScreenMessage>
    );
  }

  const tabs = TABS.filter((tab) => isAdmin || !tab.adminOnly);
  return (
    <div className="flex flex-col">
      <nav
        aria-label="Admin"
        className="sticky top-14 z-20 border-b border-border bg-surface/95 backdrop-blur md:top-0"
      >
        <ul className="mx-auto flex w-full max-w-5xl gap-1 overflow-x-auto px-3 md:px-8">
          {tabs.map((tab) => {
            const href = `${base}${tab.href}`;
            const current = tab.href === "" ? pathname === base : pathname.startsWith(href);
            return (
              <li key={tab.label} className="shrink-0">
                <Link
                  href={href}
                  aria-current={current ? "page" : undefined}
                  className={cn(
                    "-mb-px inline-flex min-h-12 items-center border-b-2 px-3 text-[15px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                    current
                      ? "border-primary font-semibold text-ink"
                      : "border-transparent text-ink-muted hover:text-ink",
                  )}
                >
                  {tab.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      {children}
    </div>
  );
}

/** The frame every console screen uses: a title, one sentence, and the content in one readable column. */
export function ConsolePage({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-5 py-8 md:px-8 md:py-10">
      <header className="flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-balance text-3xl font-semibold leading-tight tracking-tight">
            {title}
          </h1>
          {description ? (
            <p className="mt-1.5 max-w-prose text-[16px] leading-relaxed text-ink-muted">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
      </header>
      {children}
    </div>
  );
}

export function EmptyNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-card border border-dashed border-border-strong p-6 text-[16px] text-ink-muted">
      {children}
    </p>
  );
}

export function ListSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading" className="flex flex-col gap-4">
      {[0, 1, 2].map((n) => (
        <div key={n} className="flex flex-col gap-2">
          <div className="h-5 w-1/3 animate-pulse rounded bg-border/60 motion-reduce:animate-none" />
          <div className="h-4 w-2/3 animate-pulse rounded bg-border/60 motion-reduce:animate-none" />
        </div>
      ))}
    </div>
  );
}
