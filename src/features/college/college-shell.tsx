"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { DropdownMenu } from "radix-ui";
import {
  BellIcon,
  BriefcaseIcon,
  Building2Icon,
  ChevronsUpDownIcon,
  LogOutIcon,
  SettingsIcon,
  ShieldCheckIcon,
  UserRoundIcon,
  UsersIcon,
  UsersRoundIcon,
} from "lucide-react";
import { cn } from "cn";
import { Avatar } from "@/components/app/avatar";
import { accentVars } from "@/lib/color";
import { homePath } from "@/lib/home-path";
import { useSession } from "@/features/session/session-provider";
import { useCollege } from "./college-provider";

type NavItem = { href: string; label: string; icon: React.ReactNode; match?: string[] };

function isCurrent(pathname: string, item: NavItem): boolean {
  const targets = [item.href, ...(item.match ?? [])];
  return targets.some((target) => pathname === target || pathname.startsWith(`${target}/`));
}

function useNav(): { tabs: NavItem[]; more: NavItem[] } {
  const { slug, college, isModerator } = useCollege();
  const base = `/c/${slug}`;
  const tabs: NavItem[] = [];
  if (college.modules.campus)
    tabs.push({ href: `${base}/campus`, label: "Campus", icon: <Building2Icon /> });
  if (college.modules.collaborate)
    tabs.push({ href: `${base}/collaborate`, label: "Collaborate", icon: <UsersIcon /> });
  if (college.modules.career)
    tabs.push({ href: `${base}/career`, label: "Career", icon: <BriefcaseIcon /> });
  tabs.push({ href: `${base}/me`, label: "Me", icon: <UserRoundIcon /> });
  const more: NavItem[] = [{ href: `${base}/people`, label: "People", icon: <UsersRoundIcon /> }];
  if (isModerator) more.push({ href: `${base}/admin`, label: "Admin", icon: <ShieldCheckIcon /> });
  return { tabs, more };
}

function CollegeMark({ className }: { className?: string }) {
  const { college } = useCollege();
  const initials = (college.short_name || college.name).slice(0, 2).toUpperCase();
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary font-heading text-[17px] font-bold text-primary-foreground",
        className,
      )}
    >
      {initials}
    </span>
  );
}

function BellLink({ className }: { className?: string }) {
  const { slug, unread } = useCollege();
  const label = unread > 0 ? `Notifications, ${unread} unread` : "Notifications";
  return (
    <Link
      href={`/c/${slug}/notifications`}
      aria-label={label}
      className={cn(
        "relative inline-flex size-11 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-accent-soft hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      <BellIcon aria-hidden="true" className="size-[22px]" />
      {unread > 0 ? (
        <span
          aria-hidden="true"
          className="tabular absolute right-1 top-1 min-w-[18px] rounded-full bg-danger px-1 text-center text-[11px] font-bold leading-[18px] text-white"
        >
          {unread > 99 ? "99+" : unread}
        </span>
      ) : null}
    </Link>
  );
}

function UserMenu({ align = "start" }: { align?: "start" | "end" }) {
  const { slug, profile, membership } = useCollege();
  const session = useSession();
  const name = profile?.display_name ?? "You";
  const roleLabel =
    membership.role === "college_admin"
      ? "College admin"
      : membership.role === "moderator"
        ? "Moderator"
        : "Student";

  async function signOut() {
    await session.signOut();
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="flex min-h-14 w-full items-center gap-3 rounded-lg px-2 text-left transition-colors hover:bg-accent-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`Account menu for ${name}`}
        >
          <Avatar name={name} src={profile?.avatar_url} size="sm" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15px] font-semibold text-ink">{name}</span>
            <span className="block truncate text-[13px] text-ink-muted">{roleLabel}</span>
          </span>
          <ChevronsUpDownIcon aria-hidden="true" className="size-4 shrink-0 text-ink-muted" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align={align}
          side="top"
          sideOffset={8}
          className="z-50 w-60 rounded-card border border-border bg-surface p-1.5 text-[15px] shadow-[0_8px_24px_-12px_rgba(27,26,23,0.25)]"
        >
          <DropdownMenu.Item asChild>
            <Link
              href={`/c/${slug}/me/settings`}
              className="flex min-h-11 items-center gap-3 rounded-md px-3 outline-none data-[highlighted]:bg-accent-soft"
            >
              <SettingsIcon aria-hidden="true" className="size-[18px] text-ink-muted" />
              Settings
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Separator className="my-1 h-px bg-border" />
          <DropdownMenu.Item
            onSelect={() => void signOut()}
            className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-3 outline-none data-[highlighted]:bg-accent-soft"
          >
            <LogOutIcon aria-hidden="true" className="size-[18px] text-ink-muted" />
            Sign out
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function SideNavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const current = isCurrent(pathname, item);
  return (
    <Link
      href={item.href}
      aria-current={current ? "page" : undefined}
      className={cn(
        "relative flex min-h-11 items-center gap-3 rounded-lg px-3 text-[16px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&_svg]:size-5 [&_svg]:shrink-0",
        current
          ? "bg-accent-soft font-semibold text-ink before:absolute before:inset-y-2 before:-left-1.5 before:w-[3px] before:rounded-full before:bg-primary"
          : "text-ink-muted hover:bg-accent-soft/70 hover:text-ink",
      )}
    >
      <span aria-hidden="true" className={current ? "text-primary" : undefined}>
        {item.icon}
      </span>
      {item.label}
    </Link>
  );
}

export function CollegeShell({ children }: { children: React.ReactNode }) {
  const { slug, college } = useCollege();
  const pathname = usePathname();
  const { tabs, more } = useNav();

  return (
    <div
      style={accentVars(college.accent_hex) as React.CSSProperties}
      className="min-h-dvh bg-bg text-ink md:grid md:grid-cols-[17rem_minmax(0,1fr)]"
    >
      <a
        href="#main"
        className="sr-only z-50 rounded-lg bg-surface px-4 py-3 font-medium text-ink focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:ring-2 focus:ring-ring"
      >
        Skip to content
      </a>

      {/* Desktop and tablet: a sidebar with the college, the areas, and the person */}
      <aside className="sticky top-0 hidden h-dvh flex-col gap-6 border-r border-border bg-surface px-4 py-5 md:flex">
        <div className="flex items-center gap-3 px-1">
          <Link
            href={homePath(slug)}
            className="flex min-w-0 flex-1 items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <CollegeMark />
            <span className="min-w-0">
              <span className="block truncate font-heading text-[18px] font-semibold leading-tight">
                {college.name}
              </span>
              {college.city ? (
                <span className="block truncate text-[13px] text-ink-muted">{college.city}</span>
              ) : null}
            </span>
          </Link>
          <BellLink />
        </div>

        <nav aria-label="College" className="flex flex-1 flex-col gap-6 overflow-y-auto">
          <ul className="flex flex-col gap-1">
            {tabs.map((item) => (
              <li key={item.href}>
                <SideNavLink item={item} pathname={pathname} />
              </li>
            ))}
          </ul>
          <div>
            <p className="px-3 pb-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
              Your college
            </p>
            <ul className="flex flex-col gap-1">
              {more.map((item) => (
                <li key={item.href}>
                  <SideNavLink item={item} pathname={pathname} />
                </li>
              ))}
            </ul>
          </div>
        </nav>

        <div className="border-t border-border pt-3">
          <UserMenu />
        </div>
      </aside>

      <div className="flex min-h-dvh min-w-0 flex-col">
        {/* Phone: a slim bar with the college, people and the bell */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-surface/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-surface/85 md:hidden">
          <Link
            href={homePath(slug)}
            className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <CollegeMark className="size-8 text-[14px]" />
            <span className="truncate font-heading text-[17px] font-semibold">{college.name}</span>
          </Link>
          <Link
            href={`/c/${slug}/people`}
            aria-label="People in your college"
            className="inline-flex size-11 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-accent-soft hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <UsersRoundIcon aria-hidden="true" className="size-[22px]" />
          </Link>
          <BellLink />
        </header>

        <main
          id="main"
          tabIndex={-1}
          className="page-enter flex-1 pb-[calc(5rem+var(--safe-bottom))] outline-none md:pb-16"
        >
          {children}
        </main>
      </div>

      {/* Phone: the main areas, always within reach of the thumb */}
      <nav
        aria-label="College"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface pb-[var(--safe-bottom)] md:hidden"
      >
        <ul className="flex">
          {tabs.map((item) => {
            const current = isCurrent(pathname, item);
            return (
              <li key={item.href} className="flex-1">
                <Link
                  href={item.href}
                  aria-current={current ? "page" : undefined}
                  className={cn(
                    "relative flex min-h-16 flex-col items-center justify-center gap-1 px-1 text-[13px] leading-none outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring [&_svg]:size-[22px]",
                    current ? "font-semibold text-primary" : "text-ink-muted",
                  )}
                >
                  {current ? (
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-5 top-0 h-[3px] rounded-b-full bg-primary"
                    />
                  ) : null}
                  <span aria-hidden="true">{item.icon}</span>
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

export { UserMenu, BellLink };
