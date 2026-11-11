"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ActivityIcon,
  FileTextIcon,
  Building2Icon,
  FlagIcon,
  KeyRoundIcon,
  LayoutDashboardIcon,
  ScrollTextIcon,
  UsersIcon,
} from "lucide-react";
import { cn } from "cn";

const ITEMS = [
  { href: "/owner", label: "Overview", icon: <LayoutDashboardIcon /> },
  { href: "/owner/colleges", label: "Colleges", icon: <Building2Icon /> },
  { href: "/owner/codes", label: "Setup codes", icon: <KeyRoundIcon /> },
  { href: "/owner/users", label: "Users", icon: <UsersIcon /> },
  { href: "/owner/content", label: "Content", icon: <FileTextIcon /> },
  { href: "/owner/reports", label: "Reports", icon: <FlagIcon /> },
  { href: "/owner/health", label: "Health", icon: <ActivityIcon /> },
  { href: "/owner/audit", label: "Audit", icon: <ScrollTextIcon /> },
];

/** The side list on a wide screen, a sideways row on a phone. */
export function OwnerNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Owner" className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">
      {ITEMS.map((item) => {
        const current =
          item.href === "/owner" ? pathname === "/owner" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={current ? "page" : undefined}
            className={cn(
              "flex h-10 shrink-0 items-center gap-2.5 rounded-xl px-3 text-[14px] font-medium outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-ring [&_svg]:size-[18px]",
              current
                ? "bg-white/[0.1] text-ink"
                : "text-ink-muted hover:bg-white/[0.05] hover:text-ink",
            )}
          >
            {item.icon}
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
