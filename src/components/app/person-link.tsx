import * as React from "react";
import Link from "next/link";
import { cn } from "cn";

const NOBODY = "00000000-0000-0000-0000-000000000000";

/**
 * A name (or a picture) that opens the person's profile. Anonymous authors have no profile to open, so for them it is plain text.
 * `plain` keeps it out of the tab order, for a picture beside a name that already links.
 */
export function PersonLink({
  slug,
  userId,
  children,
  className,
  plain = false,
}: {
  slug: string;
  userId: string | null | undefined;
  children: React.ReactNode;
  className?: string;
  plain?: boolean;
}) {
  if (!userId || userId === NOBODY) return <span className={className}>{children}</span>;
  return (
    <Link
      href={`/c/${slug}/people/${userId}`}
      tabIndex={plain ? -1 : undefined}
      aria-hidden={plain ? true : undefined}
      className={cn(
        "rounded outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      {children}
    </Link>
  );
}
