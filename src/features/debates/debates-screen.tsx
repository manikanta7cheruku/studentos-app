"use client";

import * as React from "react";
import Link from "next/link";
import { FlameIcon, PlusIcon, ScaleIcon } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { GlideTabs } from "@/components/app/glide-tabs";
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
          <span>
            {DEBATE_TOPIC_LABEL[debate.topic]}
            {debate.visibility === "invite" ? " · Private" : ""}
          </span>
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
        {debate.top_argument ? (
          <span className="flex flex-col gap-0.5 rounded-2xl bg-white/[0.05] px-3 py-2">
            <span className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.08em] text-ink-muted">
              <span
                aria-hidden="true"
                className={cn(
                  "size-1.5 rounded-full",
                  debate.top_argument.side === 0 ? "bg-[#8f86f0]" : "bg-[#e0866a]",
                )}
              />
              {debate.top_argument.score > 0 ? "Top point" : "Latest point"} ·{" "}
              {debate.top_argument.side === 0 ? debate.side_a : debate.side_b}
            </span>
            <span className="line-clamp-2 text-[13px] leading-snug text-ink/90">
              {debate.top_argument.body}
            </span>
          </span>
        ) : null}
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
  // The liveliest debate (most people and points) is lifted to the top while looking at all live debates.
  const all = state.status === "ready" ? state.data.data : [];
  const activity = (d: Debate) => d.a_count + d.b_count + 2 * d.argument_count;
  const lively = [...all].sort((x, y) => activity(y) - activity(x))[0];
  const hot =
    status === "live" && topic === null && lively && lively.a_count + lively.b_count >= 3
      ? lively
      : null;
  const rest = hot ? all.filter((d) => d.id !== hot.id) : all;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 pt-2 pb-2 md:px-8 md:py-8">
      <PageHeader title="Debates" />
      <div
        role="toolbar"
        aria-label="Live or ended, and topic"
        data-no-swipe
        className="no-scrollbar -mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-0.5 md:mx-0 md:flex-wrap md:px-0"
      >
        <Link
          href={`/c/${slug}/debates/new`}
          className="bg-brand inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full px-4 text-[13.5px] font-bold text-white outline-none transition-transform focus-visible:ring-2 focus-visible:ring-ring active:scale-95"
        >
          <PlusIcon aria-hidden="true" className="size-4" /> Start
        </Link>
        <GlideTabs
          label="Live or ended"
          value={status}
          onChange={setStatus}
          className="shrink-0"
          tabs={[
            { value: "live", label: "Live" },
            { value: "ended", label: "Ended" },
          ]}
        />
        <span aria-hidden="true" className="h-5 w-px shrink-0 bg-white/10" />
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
      {hot ? (
        <section aria-label="Hot right now">
          <p className="mb-1.5 flex items-center gap-1.5 text-[11.5px] font-bold uppercase tracking-[0.1em] text-[#f0a58c]">
            <FlameIcon aria-hidden="true" className="size-3.5" /> Hot right now
          </p>
          <ul>
            <DebateCard debate={hot} now={now} slug={slug} />
          </ul>
        </section>
      ) : null}

      <div aria-live="polite">
        {state.status === "loading" ? (
          <div aria-busy="true" className="flex flex-col gap-3">
            {[0, 1, 2].map((n) => (
              <Skeleton key={n} className="h-36 w-full rounded-[22px]" />
            ))}
          </div>
        ) : state.status === "error" ? (
          <LoadError error={state.error} onRetry={state.reload} what="the debates" />
        ) : all.length === 0 ? (
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
            {rest.map((debate) => (
              <DebateCard key={debate.id} debate={debate} now={now} slug={slug} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
