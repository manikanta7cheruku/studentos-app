"use client";

import * as React from "react";
import { DesktopRail, type NavItem } from "./desktop-rail";

export interface AppShellProps {
  children: React.ReactNode;
  currentPath?: string;
  unreadCount?: number;
  isAdminOrModerator?: boolean;
  items?: NavItem[];
  collegeName?: string;
  logoUrl?: string | null;
  homeHref?: string;
}

/**
 * AppShell mounts the DesktopRail (with NotificationBell) for authenticated member pages.
 * Shown at 768px and wider (md breakpoint). Excludes public landing "/" and "/dev/components".
 */
export function AppShell({
  children,
  currentPath = "",
  unreadCount = 2,
  isAdminOrModerator = true,
  items,
  collegeName,
  logoUrl,
  homeHref,
}: AppShellProps) {
  return (
    <div className="flex min-h-screen w-full flex-col md:flex-row">
      <DesktopRail
        currentPath={currentPath}
        unreadCount={unreadCount}
        isAdminOrModerator={isAdminOrModerator}
        items={items}
        collegeName={collegeName}
        logoUrl={logoUrl}
        homeHref={homeHref}
      />
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
