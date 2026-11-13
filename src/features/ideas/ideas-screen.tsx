"use client";

import * as React from "react";
import Link from "next/link";
import { FlameIcon, LightbulbIcon } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadError } from "@/components/app/load-error";
import { PageHeader } from "@/components/app/page-header";
import { Spinner } from "@/components/app/spinner";
import { api, type IdeaTopic } from "@/lib/api/endpoints";
import { usePaged } from "@/lib/use-paged";
import { useCollege, usePublicLoad } from "@/features/college";
import { GLOBAL_SLUG } from "@/lib/home-path";
import { useLoad } from "@/lib/use-load";
import { IdeaCard, TOPICS, TOPIC_LABEL } from "./idea-card";
import { QuickPost } from "./quick-post";

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
        "inline-flex h-8 shrink-0 items-center rounded-full border px-3.5 text-[12.5px] font-semibold transition-[background-color,border-color,color,transform] duration-200 outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95",
        pressed
          ? "bg-brand border-transparent text-white shadow-[0_6px_16px_-8px_rgba(8,6,30,0.55)]"
          : "border-white/10 bg-white/[0.04] text-ink-muted hover:border-white/25 hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

export function IdeaListSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading buzz" className="flex flex-col gap-4">
      {[0, 1, 2].map((n) => (
        <div key={n} className="flex flex-col gap-3 rounded-[20px] border border-white/[0.06] p-4">
          <div className="flex items-center gap-2.5">
            <Skeleton className="size-7 rounded-full" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-6 w-4/5" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-9 w-40 rounded-full" />
        </div>
      ))}
    </div>
  );
}

/** Ideas: short text posts from this space. Newest first, or the best of the last month. */
export function IdeasScreen() {
  const { slug, college } = useCollege();
  const [sort, setSort] = React.useState<"new" | "top">("new");
  const [topic, setTopic] = React.useState<IdeaTopic | "all">("all");

  const list = usePaged(
    (cursor) =>
      api.ideas.list(slug, {
        sort,
        topic: topic === "all" ? undefined : topic,
        cursor,
      }),
    [slug, sort, topic],
  );

  // Buzz posted for everyone is part of the list too (when sorted by newest), with a Public tag.
  const publicBuzz = usePublicLoad(
    () =>
      sort === "new"
        ? api.ideas.list(GLOBAL_SLUG, {
            sort: "new",
            topic: topic === "all" ? undefined : topic,
            limit: 10,
          })
        : Promise.resolve(null),
    [sort, topic],
  );
  const publicIds = new Set((publicBuzz?.data ?? []).map((idea) => idea.id));
  const merged = [
    ...list.items,
    ...(publicBuzz?.data ?? []).filter((idea) => !list.items.some((item) => item.id === idea.id)),
  ].sort((a, b) => (sort === "new" ? b.created_at.localeCompare(a.created_at) : 0));

  // The most talked-about buzz of the month, kept above the list while looking at everything, newest first.
  const hot = useLoad(() => api.ideas.list(slug, { sort: "top", limit: 1 }), [slug]);
  const trending =
    sort === "new" && topic === "all" && hot.status === "ready" ? (hot.data.data[0] ?? null) : null;
  const showTrending = trending && (trending.score >= 2 || trending.comment_count >= 1);
  const rest = showTrending ? merged.filter((idea) => idea.id !== trending.id) : merged;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-5 pt-4 pb-2 md:px-8 md:py-8">
      <PageHeader app eyebrow={slug === "global" ? "Global" : college.name} title="Buzz" />

      <QuickPost onPosted={list.state.reload} />

      <div
        role="toolbar"
        aria-label="Order and topic"
        className="no-scrollbar -mx-5 flex items-center gap-2 overflow-x-auto px-5 pb-0.5 md:mx-0 md:flex-wrap md:px-0"
      >
        <div
          role="group"
          aria-label="Order"
          className="relative grid shrink-0 grid-cols-2 rounded-full border border-white/[0.08] bg-white/[0.05] p-0.5"
        >
          <span
            aria-hidden="true"
            className="absolute inset-y-0.5 left-0.5 w-[calc((100%-0.25rem)/2)] rounded-full bg-white/[0.16] shadow-[inset_0_1px_0_rgba(255,255,255,0.14)] transition-transform duration-[380ms] ease-[cubic-bezier(0.3,1.2,0.4,1)] motion-reduce:transition-none"
            style={{ transform: `translateX(${sort === "new" ? 0 : 100}%)` }}
          />
          {(["new", "top"] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={sort === value}
              onClick={() => setSort(value)}
              className={cn(
                "relative z-10 h-7 min-w-[3.6rem] rounded-full px-3.5 text-[12.5px] font-semibold outline-none transition-colors duration-300 focus-visible:ring-2 focus-visible:ring-ring",
                sort === value ? "text-ink" : "text-ink-muted hover:text-ink",
              )}
            >
              {value === "new" ? "New" : "Top"}
            </button>
          ))}
        </div>
        <span aria-hidden="true" className="h-5 w-px shrink-0 bg-white/10" />
        <Chip pressed={topic === "all"} onClick={() => setTopic("all")}>
          Everything
        </Chip>
        {TOPICS.map((value) => (
          <Chip key={value} pressed={topic === value} onClick={() => setTopic(value)}>
            {TOPIC_LABEL[value]}
          </Chip>
        ))}
      </div>

      {showTrending ? (
        <section aria-label="Trending">
          <p className="mb-1.5 flex items-center gap-1.5 text-[11.5px] font-bold uppercase tracking-[0.1em] text-[#f0a58c]">
            <FlameIcon aria-hidden="true" className="size-3.5" /> Trending this month
          </p>
          <IdeaCard idea={trending} />
        </section>
      ) : null}

      <div aria-live="polite">
        {list.state.status === "loading" ? (
          <IdeaListSkeleton />
        ) : list.state.status === "error" ? (
          <LoadError error={list.state.error} onRetry={list.state.reload} what="the buzz" />
        ) : list.items.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-[22px] border border-white/10 bg-white/[0.03] px-6 py-12 text-center">
            <span className="bg-brand inline-flex size-12 items-center justify-center rounded-2xl text-white">
              <LightbulbIcon aria-hidden="true" className="size-6" />
            </span>
            <p className="text-lg font-bold">
              {topic === "all" ? "Nothing buzzing yet" : "Nothing under this topic yet"}
            </p>
            <p className="max-w-[30ch] text-[14px] text-ink-muted">
              Be the first. A buzz can be one sentence.
            </p>
            <Button asChild className="mt-1">
              <Link href={`/c/${slug}/ideas/new`}>Share a buzz</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="stagger flex flex-col gap-3">
              {rest.map((idea) => (
                <IdeaCard
                  key={idea.id}
                  idea={idea}
                  space={publicIds.has(idea.id) ? GLOBAL_SLUG : undefined}
                />
              ))}
            </div>
            {list.hasMore ? (
              <div className="mt-6 flex flex-col items-center gap-2">
                <Button variant="outline" onClick={list.more} disabled={list.loadingMore}>
                  {list.loadingMore ? <Spinner /> : null} Show more
                </Button>
                {list.moreError ? (
                  <p className="text-[13.5px] text-danger">{list.moreError}</p>
                ) : null}
              </div>
            ) : (
              <p className="mt-6 text-center text-[13px] text-ink-muted">
                That is everything for now.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
