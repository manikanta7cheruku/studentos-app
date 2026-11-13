"use client";

import * as React from "react";
import { cn } from "cn";
import type { Debate, DebateTopic } from "@/lib/api/endpoints";

export const DEBATE_TOPICS: DebateTopic[] = [
  "movies",
  "sports",
  "tech",
  "campus",
  "politics",
  "music",
  "food",
  "other",
];

export const DEBATE_TOPIC_LABEL: Record<DebateTopic, string> = {
  movies: "Movies",
  sports: "Sports",
  tech: "Tech",
  campus: "Campus",
  politics: "Politics",
  music: "Music",
  food: "Food",
  other: "Other",
};

/** "2h 14m left", "3 days left", "Ends in a minute": how long a live debate has. */
export function timeLeft(endsAt: string, now: number): string {
  const ms = new Date(endsAt).getTime() - now;
  if (ms <= 0) return "Ended";
  const minutes = Math.ceil(ms / 60_000);
  if (minutes < 2) return "Ends in a minute";
  if (minutes < 60) return `${minutes} min left`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m left`;
  const days = Math.floor(hours / 24);
  return `${days} ${days === 1 ? "day" : "days"} left`;
}

/** A clock that ticks every 20 seconds, for the "time left" labels. */
export function useNow(): number {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 20_000);
    return () => window.clearInterval(timer);
  }, []);
  return now;
}

/** Who is ahead: 0 for side A, 1 for side B, or null for a tie (or nobody yet). */
export function leader(debate: Pick<Debate, "a_count" | "b_count">): 0 | 1 | null {
  if (debate.a_count === debate.b_count) return null;
  return debate.a_count > debate.b_count ? 0 : 1;
}

/**
 * The two sides as one bar: how many people chose each, as a share. Side A on the left in the brand colour, side B on the
 * right in a warm one. With nobody yet it is an even, quiet bar.
 */
export function SidesBar({ debate, className }: { debate: Debate; className?: string }) {
  const total = debate.a_count + debate.b_count;
  const a = total ? Math.round((debate.a_count / total) * 100) : 50;
  const b = total ? 100 - a : 50;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div
        role="img"
        aria-label={`${debate.side_a} ${a} percent, ${debate.side_b} ${b} percent`}
        className="flex h-2.5 overflow-hidden rounded-full bg-white/[0.08]"
      >
        <span
          className={cn(
            "bg-brand h-full transition-[width] duration-500 ease-out",
            total === 0 && "opacity-30",
          )}
          style={{ width: `${a}%` }}
        />
        <span
          className={cn(
            "h-full bg-[#e0866a] transition-[width] duration-500 ease-out",
            total === 0 && "opacity-30",
          )}
          style={{ width: `${b}%` }}
        />
      </div>
      <div className="tabular flex justify-between gap-3 text-[12.5px]">
        <span className="min-w-0 truncate font-semibold">
          {debate.side_a} <span className="font-normal text-ink-muted">{total ? `${a}%` : ""}</span>
        </span>
        <span className="min-w-0 truncate text-right font-semibold">
          <span className="font-normal text-ink-muted">{total ? `${b}%` : ""}</span> {debate.side_b}
        </span>
      </div>
    </div>
  );
}

/** "Agree won 62% of 40 people", "A tie", or "Nobody joined". Only for an ended debate. */
export function resultLine(debate: Debate): string {
  const total = debate.a_count + debate.b_count;
  if (total === 0) return "Nobody joined this one.";
  const lead = leader(debate);
  if (lead === null) return `A tie. ${debate.a_count} each.`;
  const winner = lead === 0 ? debate.side_a : debate.side_b;
  const count = lead === 0 ? debate.a_count : debate.b_count;
  return `${winner} won with ${Math.round((count / total) * 100)}% of ${total} ${total === 1 ? "person" : "people"}.`;
}
