"use client";

import Link from "next/link";
import { CalendarDaysIcon, ChevronRightIcon, ClockIcon, UsersIcon } from "lucide-react";
import type { EventItem, TeamPost } from "@/lib/api/endpoints";

type Soon = {
  at: number;
  href: string;
  title: string;
  kind: "Event" | "Plan";
  note: string;
};

const HOUR = 3_600_000;

/** "in 2 h", "in 35 min", "today 6 PM", "tomorrow", "started". */
export function startsIn(at: number, now: number): string {
  const ms = at - now;
  if (ms <= 0) return "Happening now";
  const min = Math.round(ms / 60_000);
  if (min < 60) return `in ${Math.max(1, min)} min`;
  const h = Math.round(ms / HOUR);
  if (h < 24) return `in ${h} h`;
  return `in ${Math.round(h / 24)} days`;
}

/** The soonest event or plan in the next 3 days, as one card. Nothing shown when there is none. */
export function pickSoonest(
  slug: string,
  events: EventItem[],
  plans: TeamPost[],
  now: number,
): Soon | null {
  const list: Soon[] = [];
  for (const e of events) {
    const at = new Date(e.starts_at).getTime();
    if (e.status === "published" && at > now - 3 * HOUR && at < now + 72 * HOUR)
      list.push({
        at,
        href: `/c/${slug}/events/${e.id}`,
        title: e.title,
        kind: "Event",
        note: e.place ?? "",
      });
  }
  for (const p of plans) {
    if (!p.deadline) continue;
    const at = new Date(p.deadline).getTime();
    if (p.status !== "open" || at <= now || at > now + 72 * HOUR) continue;
    const left = p.roles.reduce((sum, r) => sum + Math.max(0, r.slots - r.filled), 0);
    list.push({
      at,
      href: `/c/${slug}/collaborate/${p.id}`,
      title: p.title,
      kind: "Plan",
      note: left > 0 ? `${left} ${left === 1 ? "spot" : "spots"} left` : (p.place ?? ""),
    });
  }
  return list.sort((a, b) => a.at - b.at)[0] ?? null;
}

export function HappeningSoon({ soon, now }: { soon: Soon | null; now: number }) {
  if (!soon) return null;
  return (
    <section aria-label="Happening soon">
      <Link
        href={soon.href}
        className="lift glass-card group relative flex items-center gap-3.5 overflow-hidden rounded-[22px] p-4 outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -left-8 -top-10 size-28 rounded-full bg-[#8f86f0] opacity-25 blur-2xl"
        />
        <span className="bg-brand relative inline-flex size-12 shrink-0 items-center justify-center rounded-2xl text-white [&_svg]:size-6">
          {soon.kind === "Event" ? (
            <CalendarDaysIcon aria-hidden="true" />
          ) : (
            <UsersIcon aria-hidden="true" />
          )}
        </span>
        <span className="relative min-w-0 flex-1">
          <span className="flex items-center gap-1.5 text-[11.5px] font-bold uppercase tracking-[0.1em] text-[#f0a58c]">
            <ClockIcon aria-hidden="true" className="size-3.5" /> Happening soon ·{" "}
            {startsIn(soon.at, now)}
          </span>
          <span className="mt-0.5 block truncate text-[15.5px] font-bold">{soon.title}</span>
          <span className="block truncate text-[12.5px] text-ink-muted">
            {soon.kind}
            {soon.note ? ` · ${soon.note}` : ""}
          </span>
        </span>
        <ChevronRightIcon
          aria-hidden="true"
          className="relative size-5 shrink-0 text-ink-muted transition-transform duration-200 group-hover:translate-x-0.5"
        />
      </Link>
    </section>
  );
}
