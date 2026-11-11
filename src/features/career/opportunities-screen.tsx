"use client";

import * as React from "react";
import Link from "next/link";
import { BookmarkIcon, CalendarIcon, SearchIcon } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadError } from "@/components/app/load-error";
import { PageHeader } from "@/components/app/page-header";
import { Spinner } from "@/components/app/spinner";
import { friendlyMessage } from "@/lib/api-client";
import { api, type Opportunity, type OpportunityKind } from "@/lib/api/endpoints";
import { useLoad } from "@/lib/use-load";
import { useCollege } from "@/features/college";
import { CareerNav } from "./career-nav";
import { KIND_LABEL, MODE_LABEL, stipendWords } from "./format";

const KINDS: OpportunityKind[] = ["internship", "job", "hackathon", "competition", "scholarship"];

type Filters = { kind: OpportunityKind | "all"; q: string; saved: boolean; hideClosed: boolean };

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

export function deadlineLabel(op: Pick<Opportunity, "deadline" | "status">): string {
  if (op.status === "expired") return "Closed";
  if (!op.deadline) return "No deadline";
  return `Deadline ${new Date(op.deadline).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}`;
}

function OpportunityRow({ op, slug }: { op: Opportunity; slug: string }) {
  const stipend = stipendWords(op);
  const place = [op.location, MODE_LABEL[op.mode]].filter(Boolean).join(" · ");
  return (
    <li className="group relative py-5 transition-colors focus-within:bg-accent-soft/40 hover:bg-accent-soft/40 sm:px-3">
      <article className="flex flex-col gap-2.5">
        <header className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-ink-muted">
          <span className="font-semibold uppercase tracking-[0.06em] text-ink">
            {KIND_LABEL[op.kind] ?? op.kind}
          </span>
          {op.saved ? (
            <span className="inline-flex items-center gap-1 font-medium text-primary">
              <BookmarkIcon aria-hidden="true" className="size-4 fill-current" /> Saved
            </span>
          ) : null}
          {op.changed_since_saved ? (
            <span className="font-medium text-warning">Changed since you saved it</span>
          ) : null}
          {op.status === "expired" ? <span>Closed</span> : null}
        </header>
        <h2 className="text-balance text-[1.3rem] font-semibold leading-snug">
          <Link
            href={`/c/${slug}/career/opportunities/${op.id}`}
            className="outline-none after:absolute after:inset-0 group-hover:underline group-hover:underline-offset-4 focus-visible:underline"
          >
            {op.title}
          </Link>
        </h2>
        <p className="text-[14px] text-ink-muted">
          {op.org}
          {place ? ` · ${place}` : ""}
        </p>
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-ink-muted">
          <span className="inline-flex items-center gap-1.5">
            <CalendarIcon aria-hidden="true" className="size-4" /> {deadlineLabel(op)}
          </span>
          {stipend ? <span className="tabular">{stipend}</span> : null}
        </p>
      </article>
    </li>
  );
}

function Results({ filters }: { filters: Filters }) {
  const { slug } = useCollege();
  const query = {
    kinds: filters.kind === "all" ? undefined : [filters.kind],
    q: filters.q || undefined,
    saved: filters.saved,
    deadline: filters.hideClosed ? ("hide_closed" as const) : undefined,
  };
  const first = useLoad(() => api.opportunities.list(slug, query), [slug]);
  const [more, setMore] = React.useState<{ items: Opportunity[]; cursor: string | null } | null>(
    null,
  );
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [moreError, setMoreError] = React.useState<string | null>(null);

  if (first.status === "loading") {
    return (
      <div aria-busy="true" aria-label="Loading opportunities" className="flex flex-col gap-6 pt-4">
        {[0, 1, 2].map((n) => (
          <div key={n} className="flex flex-col gap-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-7 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ))}
      </div>
    );
  }
  if (first.status === "error") {
    return <LoadError error={first.error} onRetry={first.reload} what="the opportunities" />;
  }

  const items = [...first.data.data, ...(more?.items ?? [])];
  const cursor = more ? more.cursor : (first.data.meta.next_cursor ?? null);

  async function loadMore() {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    setMoreError(null);
    try {
      const page = await api.opportunities.list(slug, { ...query, cursor });
      setMore({
        items: [...(more?.items ?? []), ...page.data],
        cursor: page.meta.next_cursor ?? null,
      });
    } catch (caught) {
      setMoreError(friendlyMessage(caught, "We could not load more."));
    } finally {
      setLoadingMore(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="mt-4 glass-card rounded-[22px] p-8">
        <p className="text-lg font-semibold">
          {filters.saved
            ? "You have not saved any opportunity."
            : filters.kind !== "all" || filters.q
              ? "Nothing matches these filters."
              : "Your college has not posted any opportunities yet."}
        </p>
        <p className="mt-1 max-w-prose text-ink-muted">
          {filters.saved
            ? "Save the ones you like and they wait for you here."
            : "When the placement cell or a moderator posts one, it shows up here and you can save it."}
        </p>
      </div>
    );
  }

  return (
    <div>
      <ul className="glass-card divide-y divide-white/[0.07] rounded-[22px] px-4">
        {items.map((op) => (
          <OpportunityRow key={op.id} op={op} slug={slug} />
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

/** Opportunities posted by the college: filter, search, save. */
export function OpportunitiesScreen() {
  const { slug, college } = useCollege();
  const [filters, setFilters] = React.useState<Filters>({
    kind: "all",
    q: "",
    saved: false,
    hideClosed: true,
  });
  const [draft, setDraft] = React.useState("");
  const set = (patch: Partial<Filters>) => setFilters((f) => ({ ...f, ...patch }));

  React.useEffect(() => {
    const timer = window.setTimeout(() => setFilters((f) => ({ ...f, q: draft.trim() })), 350);
    return () => window.clearTimeout(timer);
  }, [draft]);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-5 py-8 md:px-8 md:py-12">
      <PageHeader
        eyebrow={college.name}
        title="Opportunities"
        description="Internships, jobs, hackathons and more, posted and checked by your college."
      />
      <CareerNav />
      <div className="flex flex-col gap-4">
        <div role="group" aria-label="Which opportunities" className="flex flex-wrap gap-2">
          <Chip pressed={!filters.saved} onClick={() => set({ saved: false })}>
            All
          </Chip>
          <Chip pressed={filters.saved} onClick={() => set({ saved: true })}>
            Saved
          </Chip>
        </div>
        <div className="relative">
          <SearchIcon
            aria-hidden="true"
            className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-ink-muted"
          />
          <Input
            type="search"
            aria-label="Search opportunities"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Search by title or company"
            className="pl-11"
            autoComplete="off"
          />
        </div>
        <div role="group" aria-label="Kind" className="flex flex-wrap gap-2">
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
            checked={!filters.hideClosed}
            onChange={(event) => set({ hideClosed: !event.target.checked })}
          />
          Also show closed ones
        </label>
      </div>
      <div aria-live="polite">
        <Results
          key={`${slug}|${filters.kind}|${filters.q}|${filters.saved}|${filters.hideClosed}`}
          filters={filters}
        />
      </div>
    </div>
  );
}
