import * as React from "react";
import { cn } from "cn";

/**
 * The filters of a feed. A small floating glass pill that stays under the top bar while the page scrolls. There is no
 * full-width strip behind it, so the feed is never cut by a band; only the pill itself is frosted.
 */
export function StickyBar({
  children,
  className,
  pillClassName,
}: {
  children: React.ReactNode;
  className?: string;
  pillClassName?: string;
}) {
  return (
    <div className={cn("pointer-events-none sticky top-12 z-20 py-1.5 md:top-2", className)}>
      <div
        className={cn(
          "glass-pill pointer-events-auto mx-auto flex w-full flex-col gap-2 rounded-[20px] p-1.5",
          pillClassName,
        )}
      >
        {children}
      </div>
    </div>
  );
}
