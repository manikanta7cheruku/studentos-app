import { GlobeIcon } from "lucide-react";
import { cn } from "cn";

/**
 * Shown on a card that came from the public space while you are looking at your college: it was posted for everyone, by
 * someone who may not be at your college.
 */
export function OutsideBadge({ className }: { className?: string }) {
  return (
    <span
      title="Posted publicly, open to everyone. It may be from outside your college."
      className={cn(
        "inline-flex h-5 shrink-0 items-center gap-1 rounded-full border border-[#7d74e0]/35 bg-[#7d74e0]/15 px-2 text-[11px] font-semibold text-[#cfcbf5]",
        className,
      )}
    >
      <GlobeIcon aria-hidden="true" className="size-3" /> Public
    </span>
  );
}
