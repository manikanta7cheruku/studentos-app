"use client";

import * as React from "react";
import Link from "next/link";
import { PlusIcon, SearchIcon } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadError } from "@/components/app/load-error";
import { PageHeader } from "@/components/app/page-header";
import { Spinner } from "@/components/app/spinner";
import { api, type TeamPost, type TeamPostKind } from "@/lib/api/endpoints";
import { friendlyMessage } from "@/lib/api-client";
import { useLoad } from "@/lib/use-load";
import { useCollege } from "@/features/college";
import { KIND_LABEL, PLAN_KINDS } from "./labels";
import { PostRow } from "./post-row";

type Filters = {
  kind: TeamPostKind | "all";
  q: string;
  scope: "all" | "mine";
  status: "open" | "all";
};

const INITIAL: Filters = { kind: "all", q: "", scope: "all", status: "open" };

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
        "inline-flex h-9 items-center rounded-full border px-4 text-[13px] font-semibold transition-[background-color,border-color,color,transform] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95",
        pressed
          ? "bg-brand border-transparent text-white shadow-[0_6px_16px_-8px_rgba(8,6,30,0.55)]"
          : "border-white/10 bg-white/[0.04] text-ink-muted hover:border-white/25 hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

function Results({ filters }: { filters: Filters }) {
  const { slug } = useCollege();
  const first = useLoad(
    () =>
      api.teamPosts.list(slug, {
        kind: filters.kind === "all" ? undefined : filters.kind,
        q: filters.q || undefined,
        mine: filters.scope === "mine",
        status: filters.status,
      }),
    [slug],
  );
  const [more, setMore] = React.useState<{ items: TeamPost[]; cursor: string | null } | null>(null);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [moreError, setMoreError] = React.useState<string | null>(null);

  if (first.status === "loading") {
    return (
      <div aria-busy="true" aria-label="Loading posts" className="flex flex-col gap-6 pt-4">
        {[0, 1, 2].map((n) => (
          <div key={n} className="flex flex-col gap-3">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-7 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-8 w-2/3" />
          </div>
        ))}
      </div>
    );
  }
  if (first.status === "error") {
    return <LoadError error={first.error} onRetry={first.reload} what="the team posts" />;
  }

  const items = [...first.data.data, ...(more?.items ?? [])];
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
        status: filters.status,
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
      <div className="mt-4 rounded-card border border-dashed border-border-strong p-8">
        <p className="text-lg font-semibold">
          {filters.scope === "mine"
            ? "You have not posted yet."
            : filtered
              ? "No plans match these filters."
              : "No plans yet."}
        </p>
        <p className="mt-1 max-w-prose text-ink-muted">
          {filters.scope === "mine"
            ? "Describe what you are building and the roles you need. Classmates with the right skills can ask to join."
            : filtered
              ? "Try another kind or a different word."
              : "Be the first: post a match, an event or a project."}
        </p>
        <Button asChild className="mt-4">
          <Link href={`/c/${slug}/collaborate/new`}>
            <PlusIcon aria-hidden="true" /> New plan
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div>
      <ul className="stagger flex flex-col gap-4">
        {items.map((post) => (
          <PostRow key={post.id} post={post} slug={slug} />
        ))}
      </ul>
      {cursor ? (
        <div className="mt-6 flex flex-col items-start gap-2">
          <Button
            variant="outline"
            size="lg"
            onClick={() => void loadMore()}
            disabled={loadingMore}
          >
            {loadingMore ? <Spinner /> : null} Show more
          </Button>
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

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-5 py-6 md:px-8 md:py-10">
      <PageHeader
        eyebrow={college.name}
        title="Plans"
        description="Matches, events, hackathons and projects looking for people. Join one, or start your own."
        actions={
          <>
            <Button asChild variant="outline">
              <Link href={`/c/${slug}/collaborate/requests`}>Requests</Link>
            </Button>
            <Button asChild>
              <Link href={`/c/${slug}/collaborate/new`}>
                <PlusIcon aria-hidden="true" /> New plan
              </Link>
            </Button>
          </>
        }
      />

      <div className="flex flex-col gap-3">
        <div
          role="group"
          aria-label="Filter plans"
          className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-0.5 [scrollbar-width:none] md:mx-0 md:flex-wrap md:px-0"
        >
          <Chip
            pressed={filters.scope === "all" && filters.kind === "all"}
            onClick={() => set({ scope: "all", kind: "all" })}
          >
            All
          </Chip>
          {PLAN_KINDS.map((kind) => (
            <Chip
              key={kind}
              pressed={filters.scope === "all" && filters.kind === kind}
              onClick={() => set({ scope: "all", kind })}
            >
              {KIND_LABEL[kind]}
            </Chip>
          ))}
          <Chip
            pressed={filters.scope === "mine"}
            onClick={() => set({ scope: "mine", kind: "all" })}
          >
            Mine
          </Chip>
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
            className="h-11 pl-10"
            autoComplete="off"
          />
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
