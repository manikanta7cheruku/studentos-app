"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboardIcon,
  ShieldCheckIcon,
  UsersIcon,
  MailIcon,
  SettingsIcon,
  ScrollTextIcon,
} from "lucide-react";
import { cn } from "cn";

import { BottomNav, type BottomNavItem } from "@/components/ui/bottom-nav";

type AdminNavProps = {
  basePath: string;
};

const navItems = [
  { segment: "", label: "Dashboard", icon: <LayoutDashboardIcon /> },
  { segment: "/verification", label: "Verification", icon: <ShieldCheckIcon /> },
  { segment: "/members", label: "Members", icon: <UsersIcon /> },
  { segment: "/invites", label: "Invites", icon: <MailIcon /> },
  { segment: "/settings", label: "Settings", icon: <SettingsIcon /> },
  { segment: "/audit", label: "Audit log", icon: <ScrollTextIcon /> },
];

export function AdminNav({ basePath }: AdminNavProps) {
  const pathname = usePathname();

  const bottomItems: BottomNavItem[] = navItems.map((item) => ({
    href: `${basePath}${item.segment}`,
    label: item.label,
    icon: item.icon,
  }));

  return (
    <>
      {/* Desktop / tablet: side nav */}
      <nav aria-label="Admin" className="hidden shrink-0 md:block md:w-56">
        <ul className="sticky top-4 flex flex-col gap-1">
          {navItems.map((item) => {
            const href = `${basePath}${item.segment}`;
            const isCurrent =
              item.segment === ""
                ? pathname === basePath || pathname === `${basePath}/`
                : pathname.startsWith(href);
            return (
              <li key={item.segment}>
                <Link
                  href={href}
                  aria-current={isCurrent ? "page" : undefined}
                  className={cn(
                    "flex min-h-11 items-center gap-3 rounded-lg px-3 text-base font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring [&_svg]:size-5",
                    isCurrent
                      ? "bg-accent text-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  {item.icon}
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Mobile: bottom nav */}
      <BottomNav items={bottomItems} currentPath={pathname} label="Admin" />
    </>
  );
}
