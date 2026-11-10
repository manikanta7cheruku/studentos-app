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
import { KINDS, KIND_LABEL } from "./labels";
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
        "inline-flex min-h-11 items-center rounded-full border px-4 text-[13.5px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        pressed
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-surface text-ink hover:border-border-strong",
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
              ? "No posts match these filters."
              : "No team posts yet."}
        </p>
        <p className="mt-1 max-w-prose text-ink-muted">
          {filters.scope === "mine"
            ? "Describe what you are building and the roles you need. Classmates with the right skills can ask to join."
            : filtered
              ? "Try another kind or a different word."
              : "Be the first: post a project, a hackathon team or a startup idea."}
        </p>
        <Button asChild className="mt-4">
          <Link href={`/c/${slug}/collaborate/new`}>
            <PlusIcon aria-hidden="true" /> New post
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div>
      <ul className="divide-y divide-border border-y border-border">
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
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-5 py-8 md:px-8 md:py-12">
      <PageHeader
        eyebrow={college.name}
        title="Find your team"
        description="Projects, hackathons and startups looking for people. Ask to join a role, or post your own."
        actions={
          <>
            <Button asChild variant="outline" size="lg">
              <Link href={`/c/${slug}/collaborate/requests`}>Requests</Link>
            </Button>
            <Button asChild size="lg">
              <Link href={`/c/${slug}/collaborate/new`}>
                <PlusIcon aria-hidden="true" /> New post
              </Link>
            </Button>
          </>
        }
      />

      <div className="flex flex-col gap-4">
        <div role="group" aria-label="Which posts" className="flex flex-wrap gap-2">
          <Chip pressed={filters.scope === "all"} onClick={() => set({ scope: "all" })}>
            All posts
          </Chip>
          <Chip pressed={filters.scope === "mine"} onClick={() => set({ scope: "mine" })}>
            My posts
          </Chip>
        </div>
        <div className="relative">
          <SearchIcon
            aria-hidden="true"
            className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-ink-muted"
          />
          <Input
            type="search"
            aria-label="Search posts"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Search by title or description"
            className="pl-11"
            autoComplete="off"
          />
        </div>
        <div role="group" aria-label="Kind of post" className="flex flex-wrap gap-2">
          <Chip pressed={filters.kind === "all"} onClick={() => set({ kind: "all" })}>
            Everything
          </Chip>
          {KINDS.map((kind) => (
            <Chip key={kind} pressed={filters.kind === kind} onClick={() => set({ kind })}>
              {KIND_LABEL[kind]}
            </Chip>
          ))}
        </div>
        <label className="flex min-h-11 w-fit items-center gap-3 text-[13.5px] text-ink">
          <input
            type="checkbox"
            className="size-5 accent-[var(--primary)]"
            checked={filters.status === "all"}
            onChange={(event) => set({ status: event.target.checked ? "all" : "open" })}
          />
          Also show closed and full posts
        </label>
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
