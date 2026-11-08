"use client";

import * as React from "react";
import Link from "next/link";
import {
  Building2Icon,
  UsersIcon,
  BriefcaseIcon,
  UserIcon,
  ShieldAlertIcon,
  SearchIcon,
} from "lucide-react";
import { cn } from "cn";
import { NotificationBell } from "./notification-bell";

export interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

export interface DesktopRailProps {
  currentPath: string;
  unreadCount?: number;
  isAdminOrModerator?: boolean;
  className?: string;
  items?: NavItem[];
  collegeName?: string;
  logoUrl?: string | null;
  homeHref?: string;
}

/**
 * Desktop left rail navigation for StudentOS.
 * Shown on screens >= 768px (md breakpoint).
 * Includes the core destinations (Campus, Collaborate, Career, Me, Admin), search, and the notification bell.
 */
export function DesktopRail({
  currentPath,
  unreadCount = 0,
  isAdminOrModerator = false,
  className,
  items,
  collegeName,
  logoUrl,
  homeHref,
}: DesktopRailProps) {
  const defaultNavItems: NavItem[] = [
    { href: "/campus", label: "Campus", icon: <Building2Icon className="size-6" /> },
    { href: "/collaborate", label: "Collaborate", icon: <UsersIcon className="size-6" /> },
    { href: "/career", label: "Career", icon: <BriefcaseIcon className="size-6" /> },
    { href: "/me", label: "Me", icon: <UserIcon className="size-6" /> },
  ];

  if (isAdminOrModerator && !items) {
    defaultNavItems.push({
      href: "/admin",
      label: "Admin",
      icon: <ShieldAlertIcon className="size-6" />,
    });
  }

  const primaryNavItems = items ?? defaultNavItems;

  const initials = collegeName ? collegeName.slice(0, 2).toUpperCase() : "OS";
  const homeLabel = logoUrl
    ? collegeName
      ? `${collegeName} Home`
      : "StudentOS Home"
    : `${initials} - ${collegeName ? `${collegeName} Home` : "StudentOS Home"}`;

  return (
    <nav
      aria-label="Desktop primary"
      data-slot="desktop-rail"
      className={cn(
        "hidden md:flex w-28 md:w-32 shrink-0 sticky top-0 h-screen flex-col items-center justify-between border-r border-border bg-surface py-6 z-30",
        className,
      )}
    >
      <div className="flex w-full flex-col items-center gap-6">
        <Link
          href={homeHref ?? primaryNavItems[0]?.href ?? "/campus"}
          aria-label={homeLabel}
          className="flex min-h-11 min-w-11 items-center justify-center rounded-card font-heading text-xl font-bold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt={collegeName ?? "College logo"}
              className="size-8 rounded object-contain"
            />
          ) : (
            <span>{initials}</span>
          )}
        </Link>

        <ul className="flex w-full flex-col items-center gap-3">
          {primaryNavItems.map((item) => {
            const isCurrent =
              currentPath === item.href ||
              (item.href !== "/" && currentPath.startsWith(`${item.href}/`));

            return (
              <li key={item.href} className="w-full px-2">
                <Link
                  href={item.href}
                  aria-current={isCurrent ? "page" : undefined}
                  className={cn(
                    "flex min-h-11 w-full flex-col items-center justify-center gap-1 rounded-card p-2 text-center text-base transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isCurrent
                      ? "bg-accent font-semibold text-primary"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                  )}
                >
                  <span aria-hidden="true">{item.icon}</span>
                  <span className="text-base">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="flex flex-col items-center gap-4">
        <Link
          href="/search"
          aria-label="Search"
          className="flex min-h-11 min-w-11 items-center justify-center rounded-card text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <SearchIcon className="size-6" aria-hidden="true" />
        </Link>

        <NotificationBell unreadCount={unreadCount} />
      </div>
    </nav>
  );
}
