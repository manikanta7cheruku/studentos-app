import { cn } from "cn";

/** A small spinning ring. Always put a text next to it (or an aria-label on the parent): colour or motion alone says nothing. */
export function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-block size-4 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none",
        className,
      )}
    />
  );
}
