"use client";

import * as React from "react";
import Link from "next/link";
import { MessageCircleHeartIcon, UsersIcon } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { ExploreTiles } from "@/components/app/explore-tiles";
import { LoadError } from "@/components/app/load-error";
import {
  api,
  type BoardItem,
  type EventItem,
  type Idea,
  type TeamPost,
  type Venue,
} from "@/lib/api/endpoints";
import { CampusNotice } from "./campus-notice";
import { DailyCards } from "./daily-cards";
import { NetworkCard } from "./network-card";
import { FinishProfile } from "./finish-profile";
import { useLoad } from "@/lib/use-load";
import { useCollege, usePublicLoad } from "@/features/college";
import { GLOBAL_SLUG } from "@/lib/home-path";
import { PostRow } from "@/features/collaborate/post-row";
import { IdeaCard } from "@/features/ideas/idea-card";
import { IdeaListSkeleton } from "@/features/ideas/ideas-screen";
import { EventCard } from "@/features/events/event-card";
import { BoardCard } from "@/features/board/board-card";
import { VenueCard } from "@/features/turf/venue-card";

type Item =
  | { kind: "plan"; at: string; post: TeamPost; outside: boolean }
  | { kind: "idea"; at: string; idea: Idea; outside: boolean }
  | { kind: "event"; at: string; event: EventItem; outside: boolean }
  | { kind: "board"; at: string; post: BoardItem }
  | { kind: "venue"; at: string; venue: Venue; outside: boolean };
type Tab = "all" | "plans" | "ideas";

const TABS: { value: Tab; label: string }[] = [
  { value: "all", label: "For you" },
  { value: "plans", label: "Plans" },
  { value: "ideas", label: "Buzz" },
];

function greeting(now = new Date()): string {
  const hour = now.getHours();
  if (hour < 5) return "Up late";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/**
 * The three sections of the feed as one segmented control with a thumb that glides to the open section. It sits in the page
 * and scrolls away with it, so nothing stays pinned over the feed.
 */
function FeedTabs({ tab, onChange }: { tab: Tab; onChange: (tab: Tab) => void }) {
  const index = TABS.findIndex((item) => item.value === tab);

  function onKeyDown(event: React.KeyboardEvent) {
    const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const next = TABS[(index + step + TABS.length) % TABS.length]!;
    onChange(next.value);
    (
      event.currentTarget.querySelector(`[data-tab="${next.value}"]`) as HTMLElement | null
    )?.focus();
  }

  return (
    <div
      role="tablist"
      aria-label="What to show"
      onKeyDown={onKeyDown}
      className="relative grid grid-cols-3 rounded-2xl border border-white/[0.08] bg-white/[0.05] p-1"
    >
      {/* One highlight that glides to the open section. */}
      <span
        aria-hidden="true"
        className="absolute inset-y-1 left-1 w-[calc((100%-0.5rem)/3)] rounded-xl bg-white/[0.14] shadow-[inset_0_1px_0_rgba(255,255,255,0.14)] transition-transform duration-[380ms] ease-[cubic-bezier(0.3,1.2,0.4,1)]"
        style={{ transform: `translateX(${index * 100}%)` }}
      />
      {TABS.map((item) => (
        <button
          key={item.value}
          role="tab"
          type="button"
          data-tab={item.value}
          tabIndex={tab === item.value ? 0 : -1}
          aria-selected={tab === item.value}
          onClick={() => onChange(item.value)}
          className={cn(
            "relative z-10 h-9 rounded-xl text-[13.5px] font-semibold outline-none transition-colors duration-300 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97]",
            tab === item.value ? "text-ink" : "text-ink-muted hover:text-ink",
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

/**
 * The home feed. Everything new in this space in one place, newest first: plans, events, buzz, market posts and lost
 * and found. "Plans" shows plans and events, "Buzz" shows buzz only. A list that fails to load does not hide the rest.
 */
export function HomeScreen() {
  const { slug, profile, college } = useCollege();
  const [tab, setTab] = React.useState<Tab>("all");
  const plans = useLoad(() => api.teamPosts.list(slug, { status: "open", limit: 10 }), [slug]);
  const ideas = useLoad(() => api.ideas.list(slug, { sort: "new", limit: 10 }), [slug]);
  const events = useLoad(() => api.events.list(slug, { when: "upcoming" }), [slug]);
  const market = useLoad(() => api.board.list(slug, { board: "market", limit: 8 }), [slug]);
  const lost = useLoad(() => api.board.list(slug, { board: "lostfound", limit: 6 }), [slug]);
  const venues = useLoad(() => api.venues.list(slug), [slug]);
  // What was posted for everyone (the public space) is part of every college feed, with a Public tag.
  const publicPlans = usePublicLoad(
    () => api.teamPosts.list(GLOBAL_SLUG, { status: "open", limit: 8 }),
    [],
  );
  const publicIdeas = usePublicLoad(
    () => api.ideas.list(GLOBAL_SLUG, { sort: "new", limit: 8 }),
    [],
  );
  const publicEvents = usePublicLoad(() => api.events.list(GLOBAL_SLUG, { when: "upcoming" }), []);

  const isGlobal = slug === GLOBAL_SLUG;
  const first = profile?.display_name.split(/\s+/)[0] ?? "there";
  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const sources = [plans, ideas, events, market, lost, venues];
  const loading = sources.some((source) => source.status === "loading");
  const failed = sources.every((source) => source.status === "error");

  const items: Item[] = [];
  if (tab !== "ideas") {
    if (plans.status === "ready")
      for (const post of plans.data.data)
        items.push({ kind: "plan", at: post.created_at, post, outside: false });
    if (events.status === "ready")
      for (const event of events.data.slice(0, 10))
        items.push({ kind: "event", at: event.created_at, event, outside: false });
    for (const post of publicPlans?.data ?? [])
      items.push({ kind: "plan", at: post.created_at, post, outside: true });
    for (const event of (publicEvents ?? []).slice(0, 8))
      items.push({ kind: "event", at: event.created_at, event, outside: true });
    // Turf and courts sit with the plans: a place to play, and a way to book it. Only in a college: a ground belongs to one
    // campus, so Global has none and what is public does not show up here either.
    if (!isGlobal && venues.status === "ready")
      for (const venue of venues.data.slice(0, 6))
        items.push({ kind: "venue", at: venue.created_at, venue, outside: false });
  }
  if (tab !== "plans" && ideas.status === "ready") {
    for (const idea of ideas.data.data)
      items.push({ kind: "idea", at: idea.created_at, idea, outside: false });
  }
  if (tab !== "plans") {
    for (const idea of publicIdeas?.data ?? [])
      items.push({ kind: "idea", at: idea.created_at, idea, outside: true });
  }
  if (tab === "all" && !isGlobal) {
    for (const source of [market, lost]) {
      if (source.status === "ready")
        for (const post of source.data.data)
          items.push({ kind: "board", at: post.created_at, post });
    }
  }
  // The same post is never shown twice (once as mine and once as public).
  const seen = new Set<string>();
  const unique = items.filter((item) => {
    const id =
      item.kind === "idea"
        ? item.idea.id
        : item.kind === "event"
          ? item.event.id
          : item.kind === "venue"
            ? item.venue.id
            : item.post.id;
    const key = `${item.kind}:${id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  items.length = 0;
  items.push(...unique);
  items.sort((a, b) => b.at.localeCompare(a.at));

  function reloadAll() {
    for (const source of sources) source.reload();
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-5 py-4 md:px-8 md:py-10">
      <header>
        <p className="text-[13px] text-ink-muted">{today}</p>
        <h1 className="mt-0.5 font-heading text-[1.7rem] font-extrabold leading-tight tracking-tight">
          {greeting()}, <span className="text-brand">{first}</span>
        </h1>
        <p className="mt-1 text-[14px] text-ink-muted">
          {slug === "global"
            ? "Everyone on Global."
            : `What is happening at ${college.short_name || college.name}.`}
        </p>
      </header>

      <CampusNotice />

      <DailyCards />

      <NetworkCard />

      <FinishProfile />

      <ExploreTiles slug={slug} />

      <FeedTabs tab={tab} onChange={setTab} />

      <div aria-live="polite">
        {loading && items.length === 0 ? (
          <IdeaListSkeleton />
        ) : failed ? (
          <LoadError
            error={plans.status === "error" ? plans.error : null}
            onRetry={reloadAll}
            what="your feed"
          />
        ) : items.length === 0 ? (
          <div className="glass-card flex flex-col items-center gap-3 rounded-[24px] px-6 py-12 text-center">
            <p className="text-lg font-bold">It is quiet here</p>
            <p className="max-w-[30ch] text-[14px] text-ink-muted">
              Start something. A plan for the weekend or a buzz for your campus.
            </p>
            <div className="mt-1 flex flex-wrap justify-center gap-2">
              <Button asChild>
                <Link href={`/c/${slug}/collaborate/new`}>
                  <UsersIcon aria-hidden="true" /> Make a plan
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href={`/c/${slug}/ideas/new`}>
                  <MessageCircleHeartIcon aria-hidden="true" /> Post a buzz
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          <ul key={tab} className="stagger flex flex-col gap-3">
            {items.map((item) => {
              if (item.kind === "plan")
                return (
                  <PostRow
                    key={`p-${item.post.id}`}
                    post={item.post}
                    slug={item.outside ? GLOBAL_SLUG : slug}
                    outside={item.outside}
                  />
                );
              if (item.kind === "event")
                return (
                  <EventCard
                    key={`e-${item.event.id}`}
                    event={item.event}
                    space={item.outside ? GLOBAL_SLUG : undefined}
                  />
                );
              if (item.kind === "board")
                return <BoardCard key={`b-${item.post.id}`} post={item.post} slug={slug} />;
              if (item.kind === "venue")
                return (
                  <VenueCard
                    key={`v-${item.venue.id}`}
                    venue={item.venue}
                    slug={item.outside ? GLOBAL_SLUG : slug}
                    outside={item.outside}
                  />
                );
              return (
                <li key={`i-${item.idea.id}`}>
                  <IdeaCard idea={item.idea} space={item.outside ? GLOBAL_SLUG : undefined} />
                </li>
              );
            })}
          </ul>
        )}
        {!loading && !failed && items.length > 0 ? (
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href={`/c/${slug}/collaborate`}>All plans</Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href={`/c/${slug}/events`}>All events</Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href={`/c/${slug}/turf`}>Turf and courts</Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href={`/c/${slug}/ideas`}>All buzz</Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href={`/c/${slug}/market`}>Market</Link>
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
