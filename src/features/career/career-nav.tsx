"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "cn";
import { useCollege } from "@/features/college";

/** The two parts of Career: my tracker (private) and the opportunities my college posted. */
export function CareerNav() {
  const { slug } = useCollege();
  const pathname = usePathname();
  const items = [
    {
      href: `/c/${slug}/career`,
      label: "My tracker",
      active: !pathname.includes("/career/opportunities"),
    },
    {
      href: `/c/${slug}/career/opportunities`,
      label: "Opportunities",
      active: pathname.includes("/career/opportunities"),
    },
  ];
  return (
    <nav aria-label="Career" className="flex gap-1 border-b border-border">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={item.active ? "page" : undefined}
          className={cn(
            "-mb-px inline-flex min-h-11 items-center border-b-2 px-4 text-[14px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
            item.active
              ? "border-primary font-semibold text-ink"
              : "border-transparent text-ink-muted hover:text-ink",
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
