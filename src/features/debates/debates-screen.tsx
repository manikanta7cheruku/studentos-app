"use client";

import * as React from "react";
import Link from "next/link";
import { PlusIcon, ScaleIcon } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadError } from "@/components/app/load-error";
import { PageHeader } from "@/components/app/page-header";
import { api, type Debate, type DebateTopic } from "@/lib/api/endpoints";
import { useLoad } from "@/lib/use-load";
import { useCollege } from "@/features/college";
import {
  DEBATE_TOPICS,
  DEBATE_TOPIC_LABEL,
  SidesBar,
  resultLine,
  timeLeft,
  useNow,
} from "./debate-parts";

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
          ? "bg-brand border-transparent text-white"
          : "border-white/10 bg-white/[0.04] text-ink-muted hover:border-white/25 hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

export function DebateCard({ debate, now, slug }: { debate: Debate; now: number; slug: string }) {
  const live = !debate.ended && new Date(debate.ends_at).getTime() > now;
  const people = debate.a_count + debate.b_count;
  return (
    <li>
      <Link
        href={`/c/${slug}/debates/${debate.id}`}
        className="lift glass-card flex flex-col gap-3 rounded-[22px] p-4 outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="flex items-center justify-between gap-3 text-[11.5px] font-bold uppercase tracking-[0.1em] text-ink-muted">
          <span>{DEBATE_TOPIC_LABEL[debate.topic]}</span>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 normal-case tracking-normal",
              live ? "text-[#f0a58c]" : "text-ink-muted",
            )}
          >
            {live ? (
              <span
                aria-hidden="true"
                className="size-1.5 animate-pulse rounded-full bg-[#f0a58c]"
              />
            ) : null}
            {live ? timeLeft(debate.ends_at, now) : "Ended"}
          </span>
        </span>
        <span className="text-balance text-[16.5px] font-bold leading-snug">{debate.title}</span>
        <SidesBar debate={debate} />
        <span className="tabular flex items-center justify-between gap-3 text-[12.5px] text-ink-muted">
          <span>
            {people} {people === 1 ? "person" : "people"} · {debate.argument_count}{" "}
            {debate.argument_count === 1 ? "argument" : "arguments"}
          </span>
          {!live ? <span className="truncate text-ink">{resultLine(debate)}</span> : null}
          {live && debate.my_side !== null ? (
            <span className="font-semibold text-[#b9b4ee]">
              You: {debate.my_side === 0 ? debate.side_a : debate.side_b}
            </span>
          ) : null}
        </span>
      </Link>
    </li>
  );
}

/** Debates of this space: the live ones, or the ones that closed, by topic. Anyone can start one. */
export function DebatesScreen() {
  const { slug } = useCollege();
  const [status, setStatus] = React.useState<"live" | "ended">("live");
  const [topic, setTopic] = React.useState<DebateTopic | null>(null);
  const state = useLoad(
    () => api.debates.list(slug, { status, topic: topic ?? undefined, limit: 30 }),
    [slug, status, topic],
  );
  const now = useNow();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 pt-2 pb-2 md:px-8 md:py-8">
      <PageHeader
        title="Debates"
        description="Pick a side, make your point. Each debate closes by itself when the time is up."
        actions={
          <Button asChild>
            <Link href={`/c/${slug}/debates/new`}>
              <PlusIcon aria-hidden="true" /> Start one
            </Link>
          </Button>
        }
      />
      <div
        role="group"
        aria-label="Live or ended"
        className="inline-flex w-fit rounded-full border border-white/10 bg-white/[0.04] p-1"
      >
        {(
          [
            ["live", "Live"],
            ["ended", "Ended"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={status === value}
            onClick={() => setStatus(value)}
            className={cn(
              "h-8 rounded-full px-5 text-[13px] font-semibold outline-none transition-[background-color,color] duration-200 focus-visible:ring-2 focus-visible:ring-ring",
              status === value ? "bg-white/[0.16] text-ink" : "text-ink-muted hover:text-ink",
            )}
          >
            {label}
          </button>
        ))}
      </div>
      <div
        role="group"
        aria-label="Topic"
        data-no-swipe
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none] md:mx-0 md:flex-wrap md:px-0"
      >
        <Chip pressed={topic === null} onClick={() => setTopic(null)}>
          Everything
        </Chip>
        {DEBATE_TOPICS.map((value) => (
          <Chip
            key={value}
            pressed={topic === value}
            onClick={() => setTopic(topic === value ? null : value)}
          >
            {DEBATE_TOPIC_LABEL[value]}
          </Chip>
        ))}
      </div>
      <div aria-live="polite">
        {state.status === "loading" ? (
          <div aria-busy="true" className="flex flex-col gap-3">
            {[0, 1, 2].map((n) => (
              <Skeleton key={n} className="h-36 w-full rounded-[22px]" />
            ))}
          </div>
        ) : state.status === "error" ? (
          <LoadError error={state.error} onRetry={state.reload} what="the debates" />
        ) : state.data.data.length === 0 ? (
          <div className="glass-card flex flex-col items-center gap-3 rounded-[24px] px-6 py-12 text-center">
            <span className="bg-brand inline-flex size-12 items-center justify-center rounded-2xl text-white">
              <ScaleIcon aria-hidden="true" className="size-6" />
            </span>
            <p className="text-lg font-bold">
              {status === "live" ? "No live debate right now" : "Nothing has closed yet"}
            </p>
            <p className="max-w-[34ch] text-[14px] text-ink-muted">
              {status === "live"
                ? "Start one: a film, a match, a campus rule. Two sides, a time limit, and let people argue."
                : "Debates show here once their time is up, with the result."}
            </p>
            {status === "live" ? (
              <Button asChild>
                <Link href={`/c/${slug}/debates/new`}>Start a debate</Link>
              </Button>
            ) : null}
          </div>
        ) : (
          <ul className="stagger flex flex-col gap-3">
            {state.data.data.map((debate) => (
              <DebateCard key={debate.id} debate={debate} now={now} slug={slug} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
