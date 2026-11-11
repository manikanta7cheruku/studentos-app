"use client";

import * as React from "react";
import Link from "next/link";
import { LightbulbIcon, PlusIcon } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadError } from "@/components/app/load-error";
import { PageHeader } from "@/components/app/page-header";
import { Spinner } from "@/components/app/spinner";
import { api, type IdeaTopic } from "@/lib/api/endpoints";
import { usePaged } from "@/lib/use-paged";
import { useCollege } from "@/features/college";
import { IdeaCard, TOPICS, TOPIC_LABEL } from "./idea-card";

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
        "inline-flex h-9 shrink-0 items-center rounded-full border px-4 text-[13px] font-semibold transition-[background-color,border-color,color,transform] duration-200 outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95",
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

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-5 pt-2 md:px-8 md:py-10">
      <PageHeader
        app
        eyebrow={slug === "global" ? "Global" : college.name}
        title="Buzz"
        description="Say whatever is on your mind. Vote on what you like and join the talk."
        actions={
          <Button asChild>
            <Link href={`/c/${slug}/ideas/new`}>
              <PlusIcon aria-hidden="true" /> New buzz
            </Link>
          </Button>
        }
      />

      <div className="glass-bar sticky top-14 z-20 -mx-5 flex flex-col gap-2.5 px-5 py-2.5 md:top-0 md:mx-0 md:rounded-2xl md:border md:px-4">
        <div
          role="group"
          aria-label="Order"
          className="inline-flex w-fit rounded-xl bg-white/[0.05] p-1"
        >
          {(["new", "top"] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={sort === value}
              onClick={() => setSort(value)}
              className={cn(
                "h-8 rounded-lg px-4 text-[13px] font-semibold outline-none transition-[background-color,color] duration-200 focus-visible:ring-2 focus-visible:ring-ring",
                sort === value ? "bg-white/[0.12] text-ink" : "text-ink-muted hover:text-ink",
              )}
            >
              {value === "new" ? "New" : "Top this month"}
            </button>
          ))}
        </div>
        <div
          role="group"
          aria-label="Topic"
          className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] md:mx-0 md:flex-wrap md:px-0"
        >
          <Chip pressed={topic === "all"} onClick={() => setTopic("all")}>
            Everything
          </Chip>
          {TOPICS.map((value) => (
            <Chip key={value} pressed={topic === value} onClick={() => setTopic(value)}>
              {TOPIC_LABEL[value]}
            </Chip>
          ))}
        </div>
      </div>

      <div aria-live="polite">
        {list.state.status === "loading" ? (
          <IdeaListSkeleton />
        ) : list.state.status === "error" ? (
          <LoadError error={list.state.error} onRetry={list.state.reload} what="the buzzs" />
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
            <div className="stagger flex flex-col gap-4">
              {list.items.map((idea) => (
                <IdeaCard key={idea.id} idea={idea} />
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
