"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { Building2Icon, UsersIcon, BriefcaseIcon, UserIcon } from "lucide-react";
import { AppShell } from "@/features/notifications/app-shell";
import { BottomNav, type BottomNavItem } from "@/components/ui/bottom-nav";
import type { College } from "../types";

export interface CollegeAppShellProps {
  slug: string;
  college: College;
  children: React.ReactNode;
}

export function isValidHexColor(hex: string | null | undefined): hex is string {
  if (!hex) return false;
  return /^#[0-9A-Fa-f]{6}$/.test(hex);
}

/**
 * CollegeAppShell renders the tenant application shell:
 * - Desktop (>= 768px): Left navigation rail with logo, destinations, search, and notification bell
 * - Phone (< 768px): Top mobile header and bottom 4-tab bar
 * - Sets the college accent color safely as CSS variables
 * - Filters tabs based on enabled modules (Campus, Collaborate, Career)
 * - "Me" tab is always visible
 */
export function CollegeAppShell({ slug, college, children }: CollegeAppShellProps) {
  const pathname = usePathname();

  // Validate accent color safely; fall back to StudentOS primary blue (#2340C8) if invalid
  const safeAccent = isValidHexColor(college.accent_hex) ? college.accent_hex : "#2340C8";

  // Hiding a tab in navigation is not security: the server and API route handlers must still authorize requests and verify module flags.
  const navItems: BottomNavItem[] = [];

  if (college.modules.campus) {
    navItems.push({
      href: `/c/${slug}/campus`,
      label: "Campus",
      icon: <Building2Icon className="size-6" />,
    });
  }

  if (college.modules.collaborate) {
    navItems.push({
      href: `/c/${slug}/collaborate`,
      label: "Collaborate",
      icon: <UsersIcon className="size-6" />,
    });
  }

  if (college.modules.career) {
    navItems.push({
      href: `/c/${slug}/career`,
      label: "Career",
      icon: <BriefcaseIcon className="size-6" />,
    });
  }

  // "Me" destination is always shown
  navItems.push({
    href: `/c/${slug}/me`,
    label: "Me",
    icon: <UserIcon className="size-6" />,
  });

  const collegeInitials = (college.short_name || college.name).slice(0, 2).toUpperCase();

  return (
    <div
      style={
        {
          "--accent": safeAccent,
          "--primary": safeAccent,
          "--ring": safeAccent,
        } as React.CSSProperties
      }
      className="flex min-h-screen flex-col bg-bg text-ink"
    >
      {/* Mobile Top Header (< 768px) */}
      <header className="flex h-14 items-center justify-between border-b border-border bg-surface px-4 md:hidden">
        <div className="flex items-center gap-3">
          {college.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={college.logo_url}
              alt={college.name}
              className="size-8 rounded object-contain"
            />
          ) : (
            <div
              aria-label={`${college.name} initials`}
              className="flex size-8 items-center justify-center rounded bg-accent font-heading text-sm font-bold text-primary"
            >
              {collegeInitials}
            </div>
          )}
          <span className="font-heading font-semibold text-ink line-clamp-1">{college.name}</span>
        </div>
      </header>

      {/* Responsive App Shell: Left Rail on desktop (>=768px), Content Area on all screens */}
      <AppShell
        currentPath={pathname}
        items={navItems}
        collegeName={college.name}
        logoUrl={college.logo_url}
        homeHref={`/c/${slug}/campus`}
        isAdminOrModerator={false}
      >
        <div className="flex-1 pb-20 md:pb-6">{children}</div>
      </AppShell>

      {/* Mobile Bottom Navigation (< 768px) */}
      <BottomNav items={navItems} currentPath={pathname} label="College navigation" />
    </div>
  );
}
