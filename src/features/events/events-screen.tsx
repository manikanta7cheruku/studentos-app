"use client";

import * as React from "react";
import Link from "next/link";
import { CalendarDaysIcon, PlusIcon } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadError } from "@/components/app/load-error";
import { PageHeader } from "@/components/app/page-header";
import { api } from "@/lib/api/endpoints";
import { dayLabel } from "@/lib/format";
import { useLoad } from "@/lib/use-load";
import { useCollege } from "@/features/college";
import { EventCard } from "./event-card";

type View = "upcoming" | "going" | "past";
const VIEWS: { value: View; label: string }[] = [
  { value: "upcoming", label: "Upcoming" },
  { value: "going", label: "I am going" },
  { value: "past", label: "Past" },
];

function EventSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading events" className="flex flex-col gap-4">
      {[0, 1, 2].map((n) => (
        <div key={n} className="flex gap-3.5 rounded-[20px] border border-white/[0.06] p-4">
          <Skeleton className="size-14 rounded-2xl" />
          <div className="flex-1 space-y-2.5">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-9 w-32 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Events of this space, soonest first, grouped by day. */
export function EventsScreen() {
  const { slug, college } = useCollege();
  const [view, setView] = React.useState<View>("upcoming");
  const state = useLoad(
    () =>
      api.events.list(slug, {
        when: view === "past" ? "past" : "upcoming",
        mine: view === "going",
      }),
    [slug, view],
  );

  const groups: { label: string; items: NonNullable<typeof state.data> }[] = [];
  if (state.status === "ready") {
    for (const event of state.data) {
      const label =
        view === "past"
          ? new Date(event.starts_at).toLocaleDateString(undefined, {
              day: "numeric",
              month: "long",
            })
          : dayLabel(event.starts_at);
      const last = groups[groups.length - 1];
      if (last && last.label === label) last.items.push(event);
      else groups.push({ label, items: [event] });
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-5 py-6 md:px-8 md:py-10">
      <PageHeader
        eyebrow={slug === "global" ? "Global" : college.name}
        title="Events"
        description="Fests, talks, meetups and matches. Say you are going and see who else is."
        actions={
          <Button asChild>
            <Link href={`/c/${slug}/events/new`}>
              <PlusIcon aria-hidden="true" /> New event
            </Link>
          </Button>
        }
      />
      <div
        role="tablist"
        aria-label="Which events"
        className="flex gap-1 rounded-2xl bg-white/[0.05] p-1"
      >
        {VIEWS.map((item) => (
          <button
            key={item.value}
            role="tab"
            type="button"
            aria-selected={view === item.value}
            onClick={() => setView(item.value)}
            className={cn(
              "h-9 flex-1 rounded-xl text-[13.5px] font-semibold outline-none transition-[background-color,color] duration-200 focus-visible:ring-2 focus-visible:ring-ring",
              view === item.value ? "bg-white/[0.12] text-ink" : "text-ink-muted hover:text-ink",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div aria-live="polite">
        {state.status === "loading" ? (
          <EventSkeleton />
        ) : state.status === "error" ? (
          <LoadError error={state.error} onRetry={state.reload} what="the events" />
        ) : groups.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-[22px] border border-white/10 bg-white/[0.03] px-6 py-12 text-center">
            <span className="bg-brand inline-flex size-12 items-center justify-center rounded-2xl text-white">
              <CalendarDaysIcon aria-hidden="true" className="size-6" />
            </span>
            <p className="text-lg font-bold">
              {view === "going"
                ? "You are not going to anything yet"
                : view === "past"
                  ? "No past events"
                  : "Nothing planned yet"}
            </p>
            <p className="max-w-[30ch] text-[14px] text-ink-muted">
              {view === "upcoming"
                ? "Be the first. A talk, a match, a get-together."
                : "Events you go to will show up here."}
            </p>
            {view === "upcoming" ? (
              <Button asChild className="mt-1">
                <Link href={`/c/${slug}/events/new`}>Plan an event</Link>
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {groups.map((group) => (
              <section key={group.label} aria-label={group.label}>
                <h2 className="mb-2.5 text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-muted">
                  {group.label}
                </h2>
                <ul className="stagger flex flex-col gap-3">
                  {group.items.map((event) => (
                    <EventCard key={event.id} event={event} onChange={() => state.reload()} />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
