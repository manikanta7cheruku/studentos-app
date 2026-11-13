"use client";

import Link from "next/link";
import { ScaleIcon } from "lucide-react";
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
    <Link
      href={hottest ? `/c/${slug}/debates/${hottest.id}` : `/c/${slug}/debates`}
      className="lift glass-card group relative flex min-h-[84px] w-[84%] max-w-[340px] shrink-0 items-center gap-3 overflow-hidden rounded-[20px] px-3.5 py-3 outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#e0866a]/25 text-[#f6c7b6]">
        <ScaleIcon aria-hidden="true" className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[10.5px] font-bold uppercase tracking-[0.1em] text-ink-muted">
          {hottest ? "Live debate" : "Debates"}
        </span>
        <span className="block truncate text-[14.5px] font-bold">
          {hottest
            ? hottest.title
            : debates.status === "loading"
              ? "Loading…"
              : "Start a debate on anything"}
        </span>
        <span className="tabular block truncate text-[12.5px] text-ink-muted">
          {hottest
            ? `${hottest.a_count + hottest.b_count} joined · ${timeLeft(hottest.ends_at, now)}`
            : "Pick a side, make your point"}
        </span>
      </span>
    </Link>
  );
}
