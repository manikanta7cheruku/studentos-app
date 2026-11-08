import { cn } from "cn";

export const LEVEL_LABELS = [
  "Just starting",
  "Learning",
  "Comfortable",
  "Strong",
  "Expert",
] as const;

export function levelLabel(level: number): string {
  return LEVEL_LABELS[Math.min(Math.max(level, 1), 5) - 1]!;
}

/** Five dots for a skill level. The words carry the meaning (for screen readers too); the dots are a quick glance. */
export function LevelDots({ level, className }: { level: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span aria-hidden="true" className="inline-flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <span
            key={n}
            className={cn("size-2 rounded-full", n <= level ? "bg-primary" : "bg-border-strong/60")}
          />
        ))}
      </span>
      <span className="text-[14px] text-ink-muted">{levelLabel(level)}</span>
    </span>
  );
}

export function Chip({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex min-h-8 items-center rounded-full border border-border bg-surface px-3 text-[15px] text-ink",
        className,
      )}
    >
      {children}
    </span>
  );
}
