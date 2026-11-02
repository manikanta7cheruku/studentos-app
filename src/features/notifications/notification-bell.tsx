"use client";

import * as React from "react";
import Link from "next/link";
import { BellIcon } from "lucide-react";
import { cn } from "cn";

export interface NotificationBellProps {
  /**
   * Number of unread notifications.
   * If not provided, defaults to 0.
   */
  unreadCount?: number;
  /**
   * URL to navigate to when clicked. Defaults to "/me/notifications".
   */
  href?: string;
  /**
   * Optional custom class names.
   */
  className?: string;
}

/**
 * NotificationBell represents the notification trigger in navigation (desktop left rail / headers).
 *
 * Accessibility:
 * - Button/Link has a minimum 44px tap target.
 * - Accessible name dynamically announces the unread count (e.g. "Notifications (3 unread)" or "Notifications (no unread)").
 * - Visible focus ring for keyboard navigation.
 * - Visual count badge does not rely on color alone (has visible numeric count).
 */
export function NotificationBell({
  unreadCount = 0,
  href = "/me/notifications",
  className,
}: NotificationBellProps) {
  const safeCount = Math.max(0, unreadCount);
  const displayCount = safeCount > 99 ? "99+" : safeCount.toString();
  const accessibleLabel =
    safeCount > 0 ? `Notifications (${safeCount} unread)` : "Notifications (no unread)";

  return (
    <Link
      href={href}
      aria-label={accessibleLabel}
      data-slot="notification-bell"
      className={cn(
        "relative inline-flex min-h-11 min-w-11 items-center justify-center rounded-card border border-transparent text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className,
      )}
    >
      <BellIcon className="size-6 shrink-0" aria-hidden="true" />
      {safeCount > 0 && (
        <span
          data-slot="notification-badge"
          aria-hidden="true"
          className="absolute -top-1 -right-1 inline-flex min-h-6 min-w-6 items-center justify-center rounded-full bg-danger px-1 text-base font-semibold leading-none text-surface ring-2 ring-surface"
        >
          {displayCount}
        </span>
      )}
    </Link>
  );
}
