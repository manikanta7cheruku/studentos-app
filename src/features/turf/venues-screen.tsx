"use client";

import * as React from "react";
import Link from "next/link";
import { MapPinnedIcon, PlusIcon } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadError } from "@/components/app/load-error";
import { StickyBar } from "@/components/app/sticky-bar";
import { PageHeader } from "@/components/app/page-header";
import { api } from "@/lib/api/endpoints";
import { GLOBAL_SLUG } from "@/lib/home-path";
import { useLoad } from "@/lib/use-load";
import { useCollege } from "@/features/college";
import { SPORTS, titleCase } from "./format";
import { VenueCard } from "./venue-card";

function Chip({
  pressed,
  onClick,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 shrink-0 items-center rounded-full border px-3.5 text-[12.5px] font-semibold transition-[background-color,border-color,color,transform] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95",
        pressed
          ? "bg-brand border-transparent text-white shadow-[0_6px_16px_-8px_rgba(8,6,30,0.55)]"
          : "border-white/10 bg-white/[0.04] text-ink-muted hover:border-white/25 hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

/** Turf and courts: the venues of this space, with a sport filter. Tap one to see its free hours and ask to book. */
export function VenuesScreen() {
  const { slug, college, isModerator } = useCollege();
  const [sport, setSport] = React.useState<string | null>(null);
  const state = useLoad(() => api.venues.list(slug, sport ?? undefined), [slug, sport]);
  // Inside a college only its admins and moderators add venues. In Global anyone can.
  const canAdd = slug === GLOBAL_SLUG || isModerator;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-5 pt-0.5 md:px-8 md:py-8">
      <PageHeader
        app
        eyebrow={slug === GLOBAL_SLUG ? "Global" : college.name}
        title="Turf and courts"
        description="Find a ground, pick a free hour and ask to book it. The venue confirms, and you are told."
        actions={
          <>
            <Button asChild variant="outline">
              <Link href={`/c/${slug}/turf/bookings`}>My bookings</Link>
            </Button>
            {canAdd ? (
              <Button asChild>
                <Link href={`/c/${slug}/turf/new`}>
                  <PlusIcon aria-hidden="true" /> Add a venue
                </Link>
              </Button>
            ) : null}
          </>
        }
      />

      <StickyBar>
        <div
          role="group"
          aria-label="Sport"
          className="flex snap-x gap-1.5 overflow-x-auto [scrollbar-width:none]"
        >
          <Chip pressed={sport === null} onClick={() => setSport(null)}>
            All
          </Chip>
          {SPORTS.map((value) => (
            <Chip key={value} pressed={sport === value} onClick={() => setSport(value)}>
              {titleCase(value)}
            </Chip>
          ))}
        </div>
      </StickyBar>

      <div aria-live="polite">
        {state.status === "loading" ? (
          <div aria-busy="true" aria-label="Loading venues" className="flex flex-col gap-4">
            {[0, 1, 2].map((n) => (
              <Skeleton key={n} className="h-52 w-full rounded-[24px]" />
            ))}
          </div>
        ) : state.status === "error" ? (
          <LoadError error={state.error} onRetry={state.reload} what="the venues" />
        ) : state.data.length === 0 ? (
          <div className="glass-card flex flex-col items-center gap-3 rounded-[24px] px-6 py-12 text-center">
            <span className="bg-brand inline-flex size-12 items-center justify-center rounded-2xl text-white">
              <MapPinnedIcon aria-hidden="true" className="size-6" />
            </span>
            <p className="text-lg font-bold">
              {sport ? "No venue for this sport yet" : "No venues yet"}
            </p>
            <p className="max-w-[32ch] text-[14px] text-ink-muted">
              {canAdd
                ? "Add the turf or court you know, so people can ask to book it."
                : "Your college admins add the grounds here. Ask them to add yours."}
            </p>
            {canAdd ? (
              <Button asChild className="mt-1">
                <Link href={`/c/${slug}/turf/new`}>Add a venue</Link>
              </Button>
            ) : null}
          </div>
        ) : (
          <ul className="stagger flex flex-col gap-3">
            {state.data.map((venue) => (
              <VenueCard key={venue.id} venue={venue} slug={slug} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
