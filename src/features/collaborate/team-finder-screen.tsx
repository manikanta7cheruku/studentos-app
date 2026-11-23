"use client";

import * as React from "react";
import Link from "next/link";
import { PlusIcon, SearchIcon, UsersRoundIcon } from "lucide-react";
import { GlassChip, GlassTile } from "@/components/app/glass-parts";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadError } from "@/components/app/load-error";
import { PageHeader } from "@/components/app/page-header";
import { Spinner } from "@/components/app/spinner";
import { api, type TeamPost, type TeamPostKind } from "@/lib/api/endpoints";
import { friendlyMessage } from "@/lib/api-client";
import { useLoad } from "@/lib/use-load";
import { useCollege, usePublicLoad } from "@/features/college";
import { GLOBAL_SLUG } from "@/lib/home-path";
import { KIND_LABEL, PLAN_KINDS } from "./labels";
import { PostRow } from "./post-row";

type Filters = {
  kind: TeamPostKind | "all";
  q: string;
  scope: "all" | "mine";
  status: "open" | "all";
};

const INITIAL: Filters = { kind: "all", q: "", scope: "all", status: "open" };

function Results({ filters }: { filters: Filters }) {
  const { slug } = useCollege();
  const first = useLoad(
    () =>
      api.teamPosts.list(slug, {
        kind: filters.kind === "all" ? undefined : filters.kind,
        q: filters.q || undefined,
        mine: filters.scope === "mine",
        // My own posts include the closed ones, so I can still find what I closed.
        status: filters.scope === "mine" ? "all" : filters.status,
      }),
    [slug],
  );
  // Plans posted for everyone are part of the list too (not in "Mine"), with a Public tag.
  const publicPlans = usePublicLoad(
    () =>
      filters.scope === "mine"
        ? Promise.resolve(null)
        : api.teamPosts.list(GLOBAL_SLUG, {
            kind: filters.kind === "all" ? undefined : filters.kind,
            q: filters.q || undefined,
            status: "open",
            limit: 10,
          }),
    [filters.kind, filters.q, filters.scope],
  );
  const [more, setMore] = React.useState<{ items: TeamPost[]; cursor: string | null } | null>(null);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [moreError, setMoreError] = React.useState<string | null>(null);

  if (first.status === "loading") {
    return (
      <div aria-busy="true" aria-label="Loading posts" className="flex flex-col gap-3">
        {[0, 1, 2].map((n) => (
          <Skeleton key={n} className="h-44 w-full rounded-[22px]" />
        ))}
      </div>
    );
  }
  if (first.status === "error") {
    return <LoadError error={first.error} onRetry={first.reload} what="the team posts" />;
  }

  const own = [...first.data.data, ...(more?.items ?? [])];
  const items = [
    ...own,
    ...(publicPlans?.data ?? []).filter((post) => !own.some((item) => item.id === post.id)),
  ].sort((a, b) => b.created_at.localeCompare(a.created_at));
  const publicIds = new Set((publicPlans?.data ?? []).map((post) => post.id));
  const cursor = more ? more.cursor : (first.data.meta.next_cursor ?? null);

  async function loadMore() {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    setMoreError(null);
    try {
      const page = await api.teamPosts.list(slug, {
        kind: filters.kind === "all" ? undefined : filters.kind,
        q: filters.q || undefined,
        mine: filters.scope === "mine",
        // My own posts include the closed ones, so I can still find what I closed.
        status: filters.scope === "mine" ? "all" : filters.status,
        cursor,
      });
      setMore({
        items: [...(more?.items ?? []), ...page.data],
        cursor: page.meta.next_cursor ?? null,
      });
    } catch (caught) {
      setMoreError(friendlyMessage(caught, "We could not load more posts."));
    } finally {
      setLoadingMore(false);
    }
  }

  if (items.length === 0) {
    const filtered = filters.kind !== "all" || filters.q || filters.scope === "mine";
    return (
      <div className="glass-card flex flex-col items-center gap-3 rounded-[24px] px-6 py-12 text-center">
        <GlassTile size="lg">
          <UsersRoundIcon />
        </GlassTile>
        <p className="text-lg font-bold">
          {filters.scope === "mine"
            ? "You have not posted yet."
            : filtered
              ? "No plans match these filters."
              : "No plans yet."}
        </p>
        <p className="max-w-[34ch] text-[14px] text-ink-muted">
          {filters.scope === "mine"
            ? "Describe what you are building and the roles you need. Classmates with the right skills can ask to join."
            : filtered
              ? "Try another kind or a different word."
              : "Be the first: post a match, an event or a project."}
        </p>
        <Link href={`/c/${slug}/collaborate/new`} className="profile-btn profile-btn-primary mt-1">
          <PlusIcon aria-hidden="true" /> New plan
        </Link>
      </div>
    );
  }

  return (
    <div>
      <ul className="stagger flex flex-col gap-3">
        {items.map((post) => (
          <PostRow
            key={post.id}
            post={post}
            slug={publicIds.has(post.id) ? GLOBAL_SLUG : slug}
            outside={publicIds.has(post.id)}
          />
        ))}
      </ul>
      {cursor ? (
        <div className="mt-6 flex flex-col items-start gap-2">
          <button
            type="button"
            className="profile-btn disabled:opacity-60"
            onClick={() => void loadMore()}
            disabled={loadingMore}
          >
            {loadingMore ? <Spinner /> : null} Show more
          </button>
          {moreError ? <p className="text-[13.5px] text-danger">{moreError}</p> : null}
        </div>
      ) : (
        <p className="mt-6 text-[13.5px] text-ink-muted">That is everything for now.</p>
      )}
    </div>
  );
}

/** Team Finder: every team post of this college (or of Global), with a few simple filters. */
export function TeamFinderScreen() {
  const { slug, college } = useCollege();
  const [filters, setFilters] = React.useState<Filters>(INITIAL);
  const [draft, setDraft] = React.useState("");
  const set = (patch: Partial<Filters>) => setFilters((current) => ({ ...current, ...patch }));

  // The search runs a moment after typing stops, not on every key.
  React.useEffect(() => {
    const timer = window.setTimeout(() => setFilters((f) => ({ ...f, q: draft.trim() })), 350);
    return () => window.clearTimeout(timer);
  }, [draft]);

  const newPlan = (
    <Link href={`/c/${slug}/collaborate/new`} className="profile-btn profile-btn-primary">
      <PlusIcon aria-hidden="true" /> New plan
    </Link>
  );
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-5 pt-4 pb-2 md:px-8 md:py-8">
      <PageHeader
        app
        eyebrow={college.name}
        title="Plans"
        description="Matches, events, hackathons and projects looking for people. Join one, or start your own."
        actions={
          <span className="hidden gap-2.5 sm:flex">
            <Link href={`/c/${slug}/collaborate/requests`} className="profile-btn">
              Team requests
            </Link>
            {newPlan}
          </span>
        }
      />

      <div className="flex gap-2.5 sm:hidden">
        <div className="min-w-0 flex-[2] [&>a]:w-full">{newPlan}</div>
        <Link href={`/c/${slug}/collaborate/requests`} className="profile-btn flex-1">
          Requests
        </Link>
      </div>

      <div className="relative">
        <SearchIcon
          aria-hidden="true"
          className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-ink-muted"
        />
        <Input
          type="search"
          aria-label="Search plans"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Search plans"
          className="pl-10"
          autoComplete="off"
        />
      </div>

      <div className="flex flex-col gap-3">
        <div
          role="group"
          aria-label="Filter plans"
          className="-mx-5 flex snap-x gap-2 overflow-x-auto px-5 pb-0.5 [scrollbar-width:none] md:mx-0 md:flex-wrap md:px-0"
        >
          <GlassChip
            pressed={filters.scope === "all" && filters.kind === "all"}
            onClick={() => set({ scope: "all", kind: "all" })}
          >
            All
          </GlassChip>
          {PLAN_KINDS.map((kind) => (
            <GlassChip
              key={kind}
              pressed={filters.scope === "all" && filters.kind === kind}
              onClick={() => set({ scope: "all", kind })}
            >
              {KIND_LABEL[kind]}
            </GlassChip>
          ))}
          <GlassChip
            pressed={filters.scope === "mine"}
            onClick={() => set({ scope: "mine", kind: "all" })}
          >
            Mine
          </GlassChip>
        </div>
      </div>

      <div aria-live="polite">
        <Results
          key={`${slug}|${filters.kind}|${filters.q}|${filters.scope}|${filters.status}`}
          filters={filters}
        />
      </div>
    </div>
  );
}
