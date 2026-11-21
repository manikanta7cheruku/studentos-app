"use client";

import * as React from "react";
import Link from "next/link";
import { MapPinnedIcon, PlusIcon } from "lucide-react";
import { cn } from "cn";
import { GlideTabs } from "@/components/app/glide-tabs";
import { LoadError } from "@/components/app/load-error";
import { PageHeader } from "@/components/app/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api/endpoints";
import { GLOBAL_SLUG } from "@/lib/home-path";
import { useLoad } from "@/lib/use-load";
import { useCollege } from "@/features/college";
import { GameCard } from "./game-card";
import { SPORTS, titleCase } from "./game-format";

type View = "upcoming" | "mine";

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
        "inline-flex h-8 shrink-0 items-center rounded-full border px-3.5 text-[12.5px] font-semibold outline-none transition-[background-color,border-color,color,transform] duration-200 focus-visible:ring-2 focus-visible:ring-ring active:scale-95",
        pressed
          ? "border-white/25 bg-white/[0.14] text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]"
          : "border-white/10 bg-white/[0.04] text-ink-muted hover:border-white/25 hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

/** Turf and courts: games people are setting up to play, soonest first, and the ones I am part of. */
export function GamesScreen() {
  const { slug, college } = useCollege();
  const [view, setView] = React.useState<View>("upcoming");
  const [sport, setSport] = React.useState<string | null>(null);
  const state = useLoad(
    () => api.games.list(slug, { sport: sport ?? undefined, mine: view === "mine" }),
    [slug, sport, view],
  );
  const setUp = (
    <Link href={`/c/${slug}/turf/new`} className="profile-btn profile-btn-primary">
      <PlusIcon aria-hidden="true" /> Set up a game
    </Link>
  );

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-5 pt-4 pb-2 md:px-8 md:py-8">
      <PageHeader
        app
        eyebrow={slug === GLOBAL_SLUG ? "Global" : college.name}
        title="Turf and courts"
        description="Find a game to join, or set one up at your turf or court."
        actions={<span className="hidden sm:block">{setUp}</span>}
      />
      <div className="sm:hidden [&>a]:w-full">{setUp}</div>

      <GlideTabs
        label="Games"
        value={view}
        onChange={setView}
        tabs={[
          { value: "upcoming", label: "Upcoming" },
          { value: "mine", label: "My games" },
        ]}
      />

      <div
        role="group"
        aria-label="Sport"
        className="no-scrollbar -mx-5 flex snap-x gap-2 overflow-x-auto px-5 pb-0.5 md:mx-0 md:flex-wrap md:px-0"
      >
        <Chip pressed={sport === null} onClick={() => setSport(null)}>
          All sports
        </Chip>
        {SPORTS.map((value) => (
          <Chip key={value} pressed={sport === value} onClick={() => setSport(value)}>
            {titleCase(value)}
          </Chip>
        ))}
      </div>

      <div aria-live="polite">
        {state.status === "loading" ? (
          <div aria-busy="true" aria-label="Loading games" className="flex flex-col gap-3">
            {[0, 1, 2].map((n) => (
              <Skeleton key={n} className="h-44 w-full rounded-[22px]" />
            ))}
          </div>
        ) : state.status === "error" ? (
          <LoadError error={state.error} onRetry={state.reload} what="the games" />
        ) : state.data.length === 0 ? (
          <div className="glass-card flex flex-col items-center gap-3 rounded-[24px] px-6 py-12 text-center">
            <span
              aria-hidden="true"
              className="inline-flex size-12 items-center justify-center rounded-2xl border border-white/[0.14] bg-white/[0.07] text-ink/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]"
            >
              <MapPinnedIcon className="size-6" />
            </span>
            <p className="text-lg font-bold">
              {view === "mine"
                ? "You are not in a game yet"
                : sport
                  ? `No ${sport} game yet`
                  : "No games yet"}
            </p>
            <p className="max-w-[34ch] text-[14px] text-ink-muted">
              {view === "mine"
                ? "Join one from Upcoming, or set up your own."
                : "Set up a game at the turf or court you know and let people join."}
            </p>
            <Link href={`/c/${slug}/turf/new`} className="profile-btn profile-btn-primary mt-1">
              Set up a game
            </Link>
          </div>
        ) : (
          <ul className="stagger flex flex-col gap-3">
            {state.data.map((game) => (
              <GameCard key={game.id} game={game} slug={slug} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
