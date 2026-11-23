"use client";

import * as React from "react";
import Link from "next/link";
import { CalendarDaysIcon, PlusIcon } from "lucide-react";
import { Eyebrow, GlassTile } from "@/components/app/glass-parts";
import { GlideTabs } from "@/components/app/glide-tabs";
import { LoadError } from "@/components/app/load-error";
import { PageHeader } from "@/components/app/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api/endpoints";
import { dayLabel } from "@/lib/format";
import { useLoad } from "@/lib/use-load";
import { useCollege, usePublicLoad } from "@/features/college";
import { GLOBAL_SLUG } from "@/lib/home-path";
import { EventCard } from "./event-card";

type View = "upcoming" | "going" | "past";

function EventSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading events" className="flex flex-col gap-3">
      {[0, 1, 2].map((n) => (
        <Skeleton key={n} className="h-32 w-full rounded-[22px]" />
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

  // Events posted for everyone are part of the list too (upcoming), with a Public tag.
  const publicEvents = usePublicLoad(
    () =>
      view === "upcoming"
        ? api.events.list(GLOBAL_SLUG, { when: "upcoming" })
        : Promise.resolve(null),
    [view],
  );
  const publicIds = new Set((publicEvents ?? []).map((event) => event.id));

  const groups: { label: string; items: NonNullable<typeof state.data> }[] = [];
  if (state.status === "ready") {
    const all = [
      ...state.data,
      ...(publicEvents ?? []).filter((event) => !state.data.some((item) => item.id === event.id)),
    ].sort((a, b) =>
      view === "past"
        ? b.starts_at.localeCompare(a.starts_at)
        : a.starts_at.localeCompare(b.starts_at),
    );
    for (const event of all) {
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

  const newEvent = (
    <Link href={`/c/${slug}/events/new`} className="profile-btn profile-btn-primary">
      <PlusIcon aria-hidden="true" /> New event
    </Link>
  );

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-5 pt-4 pb-2 md:px-8 md:py-8">
      <PageHeader
        app
        eyebrow={slug === "global" ? "Global" : college.name}
        title="Events"
        description="Fests, talks, meetups and matches. Say you are going and see who else is."
        actions={<span className="hidden sm:block">{newEvent}</span>}
      />
      <div className="sm:hidden [&>a]:w-full">{newEvent}</div>

      <GlideTabs
        label="Which events"
        value={view}
        onChange={setView}
        tabs={[
          { value: "upcoming", label: "Upcoming" },
          { value: "going", label: "I am going" },
          { value: "past", label: "Past" },
        ]}
      />

      <div aria-live="polite">
        {state.status === "loading" ? (
          <EventSkeleton />
        ) : state.status === "error" ? (
          <LoadError error={state.error} onRetry={state.reload} what="the events" />
        ) : groups.length === 0 ? (
          <div className="glass-card flex flex-col items-center gap-3 rounded-[24px] px-6 py-12 text-center">
            <GlassTile size="lg">
              <CalendarDaysIcon />
            </GlassTile>
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
              <Link href={`/c/${slug}/events/new`} className="profile-btn profile-btn-primary mt-1">
                Plan an event
              </Link>
            ) : null}
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {groups.map((group) => (
              <section key={group.label} aria-label={group.label}>
                <Eyebrow className="mb-2.5">{group.label}</Eyebrow>
                <ul className="stagger flex flex-col gap-3">
                  {group.items.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      space={publicIds.has(event.id) ? GLOBAL_SLUG : undefined}
                      onChange={() => state.reload()}
                    />
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
