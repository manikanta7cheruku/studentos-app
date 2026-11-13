"use client";

import Link from "next/link";
import { ChevronRightIcon, ScaleIcon } from "lucide-react";
import { api } from "@/lib/api/endpoints";
import { useLoad } from "@/lib/use-load";
import { useCollege } from "@/features/college";
import { timeLeft, useNow } from "@/features/debates/debate-parts";

/** The debate with the most people in it right now, one tap from Home. With none live it invites the first one. */
export function DailyCards() {
  const { slug } = useCollege();
  const debates = useLoad(() => api.debates.list(slug, { status: "live", limit: 10 }), [slug]);
  const now = useNow();
  const hottest =
    debates.status === "ready"
      ? [...debates.data.data].sort(
          (a, b) =>
            b.a_count + b.b_count + b.argument_count - (a.a_count + a.b_count + a.argument_count),
        )[0]
      : undefined;
  return (
    <section aria-label="Live debate">
      <Link
        href={hottest ? `/c/${slug}/debates/${hottest.id}` : `/c/${slug}/debates`}
        className="lift glass-card group relative flex flex-col gap-2 overflow-hidden rounded-[22px] px-4 py-3 outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-8 -top-10 size-28 rounded-full bg-[#e0866a] opacity-25 blur-2xl"
        />
        <span className="relative flex items-center gap-1.5 text-[11.5px] font-bold uppercase tracking-[0.1em] text-ink-muted">
          <ScaleIcon aria-hidden="true" className="size-3.5" />{" "}
          {hottest ? "Live debate" : "Debates"}
        </span>
        <span className="relative text-[15.5px] font-bold leading-snug">
          {hottest
            ? hottest.title
            : debates.status === "loading"
              ? "Loading…"
              : "Nothing live. Start a debate on a film, a match, anything."}
        </span>
        <span className="relative mt-1 flex items-center justify-between text-[13px]">
          <span className="tabular text-ink-muted">
            {hottest
              ? `${hottest.a_count + hottest.b_count} joined · ${timeLeft(hottest.ends_at, now)}`
              : "Pick a side, make your point"}
          </span>
          <span className="inline-flex items-center gap-0.5 font-semibold text-[#b9b4ee]">
            {hottest ? "Join" : "Start"}
            <ChevronRightIcon
              aria-hidden="true"
              className="size-4 transition-transform duration-200 group-hover:translate-x-0.5"
            />
          </span>
        </span>
      </Link>
    </section>
  );
}
