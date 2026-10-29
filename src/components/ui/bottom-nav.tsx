import * as React from "react";
import Link from "next/link";
import { cn } from "cn";

type BottomNavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
};

type BottomNavProps = {
  items: BottomNavItem[];
  /** The current path, so the matching item is marked as the current page. */
  currentPath: string;
  label?: string;
  className?: string;
};

/**
 * Main navigation on phones. Hidden from 768px up, where the side or top
 * navigation takes over. Use 3 to 5 items.
 */
function BottomNav({ items, currentPath, label = "Main", className }: BottomNavProps) {
  return (
    <nav
      aria-label={label}
      data-slot="bottom-nav"
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface md:hidden",
        className,
      )}
    >
      <ul className="flex">
        {items.map((item) => {
          const isCurrent =
            currentPath === item.href ||
            (item.href !== "/" && currentPath.startsWith(`${item.href}/`));
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={isCurrent ? "page" : undefined}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-1 px-1 py-2 text-center text-base leading-tight outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring [&_svg]:size-6",
                  isCurrent
                    ? "bg-accent font-semibold text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span aria-hidden="true">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export { BottomNav };
export type { BottomNavItem };
