"use client";

import * as React from "react";
import Link from "next/link";
import { LightbulbIcon, UsersIcon } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { ExploreTiles } from "@/components/app/explore-tiles";
import { LoadError } from "@/components/app/load-error";
import { api, type Idea, type TeamPost } from "@/lib/api/endpoints";
import { FinishProfile } from "./finish-profile";
import { useLoad } from "@/lib/use-load";
import { useCollege } from "@/features/college";
import { PostRow } from "@/features/collaborate/post-row";
import { IdeaCard } from "@/features/ideas/idea-card";
import { IdeaListSkeleton } from "@/features/ideas/ideas-screen";

type Item = { kind: "plan"; at: string; post: TeamPost } | { kind: "idea"; at: string; idea: Idea };
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

/** The home feed: plans and ideas of this space together, newest first, with a switch to see only one of them. */
export function HomeScreen() {
  const { slug, profile, college } = useCollege();
  const [tab, setTab] = React.useState<Tab>("all");
  const plans = useLoad(() => api.teamPosts.list(slug, { status: "open", limit: 10 }), [slug]);
  const ideas = useLoad(() => api.ideas.list(slug, { sort: "new", limit: 10 }), [slug]);

  const first = profile?.display_name.split(/\s+/)[0] ?? "there";
  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const loading = plans.status === "loading" || ideas.status === "loading";
  const failed = plans.status === "error" && ideas.status === "error";

  const items: Item[] = [];
  if (tab !== "ideas" && plans.status === "ready") {
    for (const post of plans.data.data) items.push({ kind: "plan", at: post.created_at, post });
  }
  if (tab !== "plans" && ideas.status === "ready") {
    for (const idea of ideas.data.data) items.push({ kind: "idea", at: idea.created_at, idea });
  }
  items.sort((a, b) => b.at.localeCompare(a.at));

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

      <FinishProfile />

      <ExploreTiles slug={slug} />

      <div
        role="tablist"
        aria-label="What to show"
        className="glass-bar sticky top-14 z-20 -mx-5 flex gap-1 px-5 py-2.5 md:top-0 md:mx-0 md:rounded-2xl md:border md:px-4"
      >
        {TABS.map((item) => (
          <button
            key={item.value}
            role="tab"
            type="button"
            aria-selected={tab === item.value}
            onClick={() => setTab(item.value)}
            className={cn(
              "h-9 flex-1 rounded-xl text-[13.5px] font-semibold outline-none transition-[background-color,color,box-shadow] duration-200 focus-visible:ring-2 focus-visible:ring-ring",
              tab === item.value
                ? "bg-white/[0.12] text-ink shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
                : "text-ink-muted hover:text-ink",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div aria-live="polite">
        {loading ? (
          <IdeaListSkeleton />
        ) : failed ? (
          <LoadError
            error={plans.status === "error" ? plans.error : null}
            onRetry={() => {
              plans.reload();
              ideas.reload();
            }}
            what="your feed"
          />
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-[22px] border border-white/10 bg-white/[0.03] px-6 py-12 text-center">
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
                  <LightbulbIcon aria-hidden="true" /> Share a buzz
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          <ul key={tab} className="stagger flex flex-col gap-4">
            {items.map((item) =>
              item.kind === "plan" ? (
                <PostRow key={`p-${item.post.id}`} post={item.post} slug={slug} />
              ) : (
                <li key={`i-${item.idea.id}`}>
                  <IdeaCard idea={item.idea} />
                </li>
              ),
            )}
          </ul>
        )}
        {!loading && !failed && items.length > 0 ? (
          <div className="mt-6 flex justify-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href={`/c/${slug}/collaborate`}>All plans</Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href={`/c/${slug}/ideas`}>All ideas</Link>
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
