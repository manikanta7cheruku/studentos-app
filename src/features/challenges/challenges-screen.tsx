"use client";

import * as React from "react";
import { HandIcon, TrophyIcon } from "lucide-react";
import { cn } from "cn";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Avatar } from "@/components/app/avatar";
import { LoadError } from "@/components/app/load-error";
import { PageHeader } from "@/components/app/page-header";
import { Spinner } from "@/components/app/spinner";
import { friendlyMessage } from "@/lib/api-client";
import { api, type ChallengeEntry } from "@/lib/api/endpoints";
import { timeAgo } from "@/lib/time-ago";
import { useLoad } from "@/lib/use-load";
import { badgesFor } from "@/features/profile/badges";

function daysLeft(iso: string): string {
  const days = Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
  if (days <= 1) return "Ends today";
  return `${days} days left`;
}

function Entry({
  entry,
  onChange,
}: {
  entry: ChallengeEntry;
  onChange: (next: ChallengeEntry) => void;
}) {
  const [busy, setBusy] = React.useState(false);
  async function toggle() {
    if (busy || entry.is_mine) return;
    setBusy(true);
    try {
      onChange(await api.challenges.applaud(entry.id, !entry.i_applauded));
    } catch {
      // Nothing to show: the count simply stays.
    } finally {
      setBusy(false);
    }
  }
  return (
    <li className="glass-card flex gap-3.5 rounded-[22px] p-4">
      <Avatar name={entry.author.display_name} src={entry.author.avatar_url} size="md" />
      <div className="min-w-0 flex-1">
        <p className="flex items-baseline gap-2">
          <span className="truncate text-[14.5px] font-bold">
            {entry.is_mine ? "You" : entry.author.display_name}
          </span>
          <span className="text-[12px] text-ink-muted">{timeAgo(entry.created_at)}</span>
        </p>
        <p className="mt-1 whitespace-pre-line break-words text-[15px] leading-relaxed">
          {entry.body}
        </p>
        <button
          type="button"
          onClick={() => void toggle()}
          disabled={entry.is_mine}
          aria-pressed={entry.i_applauded}
          aria-label={`Applaud, ${entry.applause} so far`}
          className={cn(
            "mt-2.5 inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-semibold outline-none transition-[background-color,border-color,color,transform] duration-200 focus-visible:ring-2 focus-visible:ring-ring active:scale-95 disabled:opacity-70",
            entry.i_applauded
              ? "bg-brand border-transparent text-white"
              : "border-white/10 bg-white/[0.04] text-ink-muted hover:border-white/25 hover:text-ink",
          )}
        >
          <HandIcon aria-hidden="true" className="size-4" />
          <span className="tabular">{entry.applause}</span>
        </button>
      </div>
    </li>
  );
}

/** This week's challenge: the same for everybody. Answer it in a few words, applaud others, earn a badge on your profile. */
export function ChallengesScreen() {
  const state = useLoad(() => api.challenges.current(), []);
  const [draft, setDraft] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [local, setLocal] = React.useState<Record<string, ChallengeEntry>>({});

  if (state.status === "loading")
    return (
      <div
        className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 pt-2 md:px-8 md:py-8"
        aria-busy="true"
      >
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-40 w-full rounded-[22px]" />
        <Skeleton className="h-24 w-full rounded-[22px]" />
      </div>
    );
  if (state.status === "error")
    return (
      <div className="mx-auto w-full max-w-2xl px-4 pt-2 md:px-8 md:py-8">
        <LoadError error={state.error} onRetry={state.reload} what="the challenge" />
      </div>
    );

  const data = state.data;
  const mine = local.__mine ?? data.my_entry;
  const text = draft ?? mine?.body ?? "";
  const merged = data.entries
    .filter((entry) => !entry.is_mine)
    .map((entry) => local[entry.id] ?? entry);
  const list = mine ? [mine, ...merged] : merged;
  const completed = data.completed + (local.__mine && !data.my_entry ? 1 : 0);
  const badge = badgesFor({
    buzz: 0,
    replies: 0,
    plans: 0,
    events: 0,
    upvotes: 0,
    challenges: completed,
    invited: 0,
  })[0];

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy || !text.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const saved = await api.challenges.answer(text.trim());
      setLocal((current) => ({ ...current, __mine: saved }));
      setDraft(null);
    } catch (caught) {
      setError(friendlyMessage(caught, "We could not save your answer. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 pt-2 pb-2 md:px-8 md:py-8">
      <PageHeader
        eyebrow={`Week ${data.week_key.split("-W")[1]} · ${daysLeft(data.ends_at)}`}
        title="Weekly challenge"
        description="The same one for everybody. Answer in a few words. Doing one adds to your profile."
      />
      <section className="glass-card relative overflow-hidden rounded-[26px] p-5">
        <span
          aria-hidden="true"
          className="bg-brand pointer-events-none absolute -right-10 -top-12 size-36 rounded-full opacity-30 blur-3xl"
        />
        <p className="relative flex items-center gap-1.5 text-[11.5px] font-bold uppercase tracking-[0.1em] text-ink-muted">
          <TrophyIcon aria-hidden="true" className="size-3.5" /> This week
        </p>
        <h2 className="relative mt-1.5 font-heading text-[1.45rem] font-extrabold leading-tight tracking-tight">
          {data.title}
        </h2>
        <p className="relative mt-1.5 text-[14.5px] leading-relaxed text-ink-muted">{data.text}</p>
        <form onSubmit={submit} className="relative mt-4 flex flex-col gap-3">
          <label htmlFor="challenge-answer" className="sr-only">
            Your answer
          </label>
          <Textarea
            id="challenge-answer"
            value={text}
            onChange={(event) => setDraft(event.target.value)}
            maxLength={300}
            rows={3}
            placeholder="Write your answer"
          />
          <div className="flex items-center justify-between gap-3">
            <span className="tabular text-[12.5px] text-ink-muted">{text.length} / 300</span>
            <Button type="submit" disabled={busy || !text.trim() || text.trim() === mine?.body}>
              {busy ? <Spinner /> : null} {mine ? "Update my answer" : "Post my answer"}
            </Button>
          </div>
        </form>
        {error ? (
          <Banner variant="error" className="relative mt-3">
            <p>{error}</p>
          </Banner>
        ) : null}
      </section>

      {completed > 0 ? (
        <p className="tabular text-center text-[13.5px] text-ink-muted">
          You have finished <b className="text-ink">{completed}</b>{" "}
          {completed === 1 ? "challenge" : "challenges"}
          {badge ? (
            <>
              {" "}
              · badge: <b className="text-ink">{badge.label}</b>
            </>
          ) : null}
        </p>
      ) : null}

      <section aria-labelledby="answers" className="flex flex-col gap-2.5">
        <h2
          id="answers"
          className="px-1 text-[12px] font-bold uppercase tracking-[0.12em] text-ink-muted"
        >
          Answers · most applauded first
        </h2>
        {list.length === 0 ? (
          <div className="glass-card rounded-[22px] p-6 text-center">
            <p className="text-[16px] font-bold">Be the first to answer</p>
            <p className="mx-auto mt-1 max-w-[34ch] text-[14px] text-ink-muted">
              Short and honest is perfect. Others can applaud it.
            </p>
          </div>
        ) : (
          <ul className="stagger flex flex-col gap-2.5">
            {list.map((entry) => (
              <Entry
                key={entry.id}
                entry={entry}
                onChange={(next) =>
                  setLocal((current) => ({ ...current, [next.is_mine ? "__mine" : next.id]: next }))
                }
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
