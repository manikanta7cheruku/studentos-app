"use client";

import * as React from "react";
import Link from "next/link";
import { CalendarIcon, PlusIcon, SearchIcon } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadError } from "@/components/app/load-error";
import { PageHeader } from "@/components/app/page-header";
import { api, type Application, type ApplicationStatus } from "@/lib/api/endpoints";
import { useLoad } from "@/lib/use-load";
import { useCollege } from "@/features/college";
import { CareerNav } from "./career-nav";
import {
  STATUSES,
  STATUS_LABEL,
  countByStatus,
  deadlineWords,
  formatDate,
  isOverdue,
  visibleApplications,
} from "./format";

export function StatusPill({ status }: { status: ApplicationStatus }) {
  return (
    <span
      className={cn(
        "inline-flex min-h-6 items-center rounded-full px-2.5 text-[12px] font-semibold",
        status === "offer"
          ? "bg-success/15 text-success"
          : status === "rejected" || status === "withdrawn"
            ? "bg-border/70 text-ink-muted"
            : "bg-accent-soft text-primary",
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

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
        "inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-[13.5px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        pressed
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-surface text-ink hover:border-border-strong",
      )}
    >
      {children}
    </button>
  );
}

function Row({ item, slug }: { item: Application; slug: string }) {
  const words = deadlineWords(item.deadline, item.status);
  const overdue = isOverdue(item);
  return (
    <li className="group relative py-4 transition-colors focus-within:bg-accent-soft/40 hover:bg-accent-soft/40 sm:px-3">
      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <div className="min-w-0">
          <h2 className="text-[1.15rem] font-semibold leading-snug">
            <Link
              href={`/c/${slug}/career/tracker/${item.id}`}
              className="outline-none after:absolute after:inset-0 group-hover:underline group-hover:underline-offset-4 focus-visible:underline"
            >
              {item.company}
            </Link>
          </h2>
          <p className="text-[14px] text-ink-muted">{item.role_title}</p>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 sm:flex-col sm:items-end sm:gap-1">
          <StatusPill status={item.status} />
          {item.deadline ? (
            <span
              className={cn(
                "inline-flex items-center gap-1.5 text-[13px]",
                overdue ? "font-semibold text-danger" : "text-ink-muted",
              )}
            >
              <CalendarIcon aria-hidden="true" className="size-4" />
              {formatDate(item.deadline)}
              {words ? ` · ${words}` : ""}
            </span>
          ) : null}
        </div>
      </div>
    </li>
  );
}

/** My applications: filter by status, search, sort by what changed last or by the nearest deadline. Private to me. */
export function TrackerScreen() {
  const { slug } = useCollege();
  const state = useLoad(() => api.applications.list(), []);
  const [status, setStatus] = React.useState<ApplicationStatus | "all">("all");
  const [sort, setSort] = React.useState<"updated" | "deadline">("updated");
  const [q, setQ] = React.useState("");

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-5 py-8 md:px-8 md:py-12">
      <PageHeader
        eyebrow="Career"
        title="My applications"
        description="Keep every internship and job you are chasing in one place. Only you can see this."
        actions={
          <Button asChild size="lg">
            <Link href={`/c/${slug}/career/tracker/new`}>
              <PlusIcon aria-hidden="true" /> Add application
            </Link>
          </Button>
        }
      />
      <CareerNav />

      {state.status === "loading" ? (
        <div
          aria-busy="true"
          aria-label="Loading your applications"
          className="flex flex-col gap-5"
        >
          {[0, 1, 2].map((n) => (
            <div key={n} className="flex flex-col gap-2">
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-4 w-1/3" />
            </div>
          ))}
        </div>
      ) : state.status === "error" ? (
        <LoadError error={state.error} onRetry={state.reload} what="your applications" />
      ) : state.data.length === 0 ? (
        <div className="rounded-card border border-dashed border-border-strong p-8">
          <p className="text-lg font-semibold">Nothing here yet.</p>
          <p className="mt-1 max-w-prose text-ink-muted">
            Add the first internship or job you are interested in, with its link and deadline. Move
            it along as things happen, and never lose a deadline again.
          </p>
          <Button asChild className="mt-4">
            <Link href={`/c/${slug}/career/tracker/new`}>
              <PlusIcon aria-hidden="true" /> Add application
            </Link>
          </Button>
        </div>
      ) : (
        <Loaded
          items={state.data}
          slug={slug}
          status={status}
          setStatus={setStatus}
          sort={sort}
          setSort={setSort}
          q={q}
          setQ={setQ}
        />
      )}
    </div>
  );
}

function Loaded({
  items,
  slug,
  status,
  setStatus,
  sort,
  setSort,
  q,
  setQ,
}: {
  items: Application[];
  slug: string;
  status: ApplicationStatus | "all";
  setStatus: (s: ApplicationStatus | "all") => void;
  sort: "updated" | "deadline";
  setSort: (s: "updated" | "deadline") => void;
  q: string;
  setQ: (q: string) => void;
}) {
  const counts = countByStatus(items);
  const shown = visibleApplications(items, { status, sort, q });
  const attention = items.filter((i) => isOverdue(i)).length;
  return (
    <>
      {attention > 0 ? (
        <p className="rounded-card border border-danger/40 bg-danger/5 px-4 py-3 text-[14px] text-ink">
          <strong className="font-semibold">
            {attention} {attention === 1 ? "application is" : "applications are"} past the deadline
          </strong>{" "}
          and still open. Update the status or remove them.
        </p>
      ) : null}
      <div className="flex flex-col gap-4">
        <div role="group" aria-label="Status" className="flex flex-wrap gap-2">
          <Chip pressed={status === "all"} onClick={() => setStatus("all")}>
            All <span className="tabular opacity-80">{counts.all}</span>
          </Chip>
          {STATUSES.filter((s) => counts[s] > 0 || status === s).map((s) => (
            <Chip key={s} pressed={status === s} onClick={() => setStatus(s)}>
              {STATUS_LABEL[s]} <span className="tabular opacity-80">{counts[s]}</span>
            </Chip>
          ))}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <SearchIcon
              aria-hidden="true"
              className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-ink-muted"
            />
            <Input
              type="search"
              aria-label="Search applications"
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="Search company or role"
              className="pl-11"
              autoComplete="off"
            />
          </div>
          <label className="flex items-center gap-2 text-[13.5px] text-ink-muted">
            Sort
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as "updated" | "deadline")}
              className="h-11 rounded-input border border-border-strong bg-surface px-3 text-base text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="updated">Recently changed</option>
              <option value="deadline">Nearest deadline</option>
            </select>
          </label>
        </div>
      </div>
      <div aria-live="polite">
        {shown.length === 0 ? (
          <p className="rounded-card border border-dashed border-border-strong p-6 text-[14px] text-ink-muted">
            No applications match. Try another status or word.
          </p>
        ) : (
          <ul className="divide-y divide-border border-y border-border">
            {shown.map((item) => (
              <Row key={item.id} item={item} slug={slug} />
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
