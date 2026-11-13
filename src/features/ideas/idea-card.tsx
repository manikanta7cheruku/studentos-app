"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowDownIcon, ArrowUpIcon, CheckIcon, MessageCircleIcon, ShareIcon } from "lucide-react";
import { cn } from "cn";
import { Avatar } from "@/components/app/avatar";
import { OutsideBadge } from "@/components/app/outside-badge";
import { api, type Idea, type IdeaTopic } from "@/lib/api/endpoints";
import { promptByKey } from "@/lib/daily-prompts";
import { timeAgo } from "@/lib/time-ago";
import { useCollege } from "@/features/college";
import { primeLoad } from "@/lib/use-load";
import { IdeaPoll } from "./idea-poll";

export const TOPIC_LABEL: Record<IdeaTopic, string> = {
  campus: "Campus life",
  study: "Study",
  sports: "Sports",
  tech: "Tech",
  food: "Food",
  other: "Other",
};
export const TOPICS = Object.keys(TOPIC_LABEL) as IdeaTopic[];

/**
 * A small like and dislike pill with a number between. It answers at once (the number and the colour change before the
 * server replies) and goes back if the server says no. Pressing the same arrow again takes the vote back.
 * It is used for a buzz and for a comment: `send` saves the vote and returns the new score and my vote.
 */
export function VotePill({
  score: serverScore,
  mine: serverMine,
  send,
  label = "Vote",
}: {
  score: number;
  mine: number;
  send: (value: 1 | -1 | 0) => Promise<{ score: number; my_vote: number }>;
  label?: string;
}) {
  // What I did on this screen (a vote not yet confirmed, or confirmed). It only counts while the server's numbers are the
  // ones it was made on, so a fresh answer from the server (a reload) replaces it.
  const from = `${serverMine}:${serverScore}`;
  const [local, setLocal] = React.useState<{ mine: number; score: number; from: string } | null>(
    null,
  );
  const [failed, setFailed] = React.useState(false);
  const current = local && local.from === from ? local : null;
  const mine = current?.mine ?? serverMine;
  const score = current?.score ?? serverScore;

  async function vote(value: 1 | -1) {
    const next = mine === value ? 0 : value;
    setLocal({ mine: next, score: score - mine + next, from });
    setFailed(false);
    try {
      const saved = await send(next);
      setLocal({ mine: saved.my_vote, score: saved.score, from });
    } catch {
      setLocal(null);
      setFailed(true);
    }
  }

  const button =
    "inline-flex size-7 items-center justify-center rounded-full outline-none transition-[background-color,color,transform] duration-150 focus-visible:ring-2 focus-visible:ring-ring active:scale-90";
  return (
    <div
      className="inline-flex h-7 items-center rounded-full bg-white/[0.06] px-0.5"
      role="group"
      aria-label={failed ? `${label} (could not save, try again)` : label}
    >
      <button
        type="button"
        aria-label="Like"
        aria-pressed={mine === 1}
        onClick={() => void vote(1)}
        className={cn(
          button,
          mine === 1 ? "bg-brand text-white" : "text-ink-muted hover:bg-white/10 hover:text-ink",
        )}
      >
        <ArrowUpIcon aria-hidden="true" className="size-[15px]" />
      </button>
      <span
        className={cn(
          "tabular min-w-6 px-0.5 text-center text-[12.5px] font-bold",
          mine === 1 && "text-[#b9b4ee]",
        )}
        aria-live="polite"
      >
        {score}
      </span>
      <button
        type="button"
        aria-label="Dislike"
        aria-pressed={mine === -1}
        onClick={() => void vote(-1)}
        className={cn(
          button,
          mine === -1 ? "bg-white/15 text-ink" : "text-ink-muted hover:bg-white/10 hover:text-ink",
        )}
      >
        <ArrowDownIcon aria-hidden="true" className="size-[15px]" />
      </button>
    </div>
  );
}

/** The vote pill of a buzz. `space` is the space the buzz lives in (it is not the one I am in when it came from Global). */
export function VoteButtons({
  idea,
  space,
  onChange,
}: {
  idea: Idea;
  space?: string;
  onChange?: (next: Idea) => void;
}) {
  const { slug } = useCollege();
  return (
    <VotePill
      score={idea.score}
      mine={idea.my_vote}
      label="Vote"
      send={async (value) => {
        const saved = await api.ideas.vote(space ?? slug, idea.id, value);
        onChange?.(saved);
        return saved;
      }}
    />
  );
}

function ShareButton({ idea, space }: { idea: Idea; space: string }) {
  const [copied, setCopied] = React.useState(false);
  async function share() {
    const url = `${window.location.origin}/c/${space}/ideas/${idea.id}`;
    try {
      if (navigator.share)
        await navigator.share({ title: idea.title || "A buzz on StudentOS", url });
      else await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // The person closed the share sheet, or the browser blocked the clipboard. Nothing to tell them.
    }
  }
  return (
    <button
      type="button"
      onClick={() => void share()}
      aria-label={copied ? "Link copied" : "Share"}
      className="inline-flex size-7 items-center justify-center rounded-full text-ink-muted outline-none transition-[background-color,color,transform] duration-150 hover:bg-white/10 hover:text-ink focus-visible:ring-2 focus-visible:ring-ring active:scale-90"
    >
      {copied ? (
        <CheckIcon aria-hidden="true" className="size-[15px] text-success" />
      ) : (
        <ShareIcon aria-hidden="true" className="size-[15px]" />
      )}
    </button>
  );
}

/**
 * One buzz in a list or at the top of its page. A quiet card: who and when on one line, the words, and one small row of
 * actions. In a list the text is cut after a few lines and the card opens it. `space` is set when it came from the
 * public space, and then a small Public tag shows.
 */
export function IdeaCard({
  idea,
  full = false,
  space,
  onChange,
}: {
  idea: Idea;
  full?: boolean;
  space?: string;
  onChange?: (next: Idea) => void;
}) {
  const { slug: here } = useCollege();
  const slug = space ?? here;
  const outside = slug !== here;
  const href = `/c/${slug}/ideas/${idea.id}`;
  return (
    <article
      onClickCapture={() => primeLoad(`idea:${slug}:${idea.id}`, idea)}
      className={cn(
        "glass-card relative flex flex-col gap-2 rounded-[18px] px-3.5 py-3",
        !full && "lift",
      )}
    >
      <header className="flex items-center gap-2">
        <Avatar name={idea.author.display_name} size="xs" />
        <p className="flex min-w-0 flex-1 items-baseline gap-1.5 leading-tight">
          {idea.is_anonymous ? (
            <span className="max-w-[60%] shrink-0 truncate text-[13px] font-semibold">
              {idea.author.display_name}
            </span>
          ) : (
            <Link
              href={`/c/${slug}/people/${idea.author.user_id}`}
              className="relative z-10 max-w-[60%] shrink-0 truncate text-[13px] font-semibold hover:underline"
            >
              {idea.author.display_name}
            </Link>
          )}
          <span className="min-w-0 truncate text-[12px] text-ink-muted">
            {idea.author.headline ? `· ${idea.author.headline} ` : ""}· {timeAgo(idea.created_at)}
          </span>
        </p>
        {outside ? <OutsideBadge /> : null}
        {idea.topic !== "other" ? (
          <span className="shrink-0 text-[11.5px] font-medium text-ink-muted">
            {TOPIC_LABEL[idea.topic]}
          </span>
        ) : null}
      </header>
      <div>
        {promptByKey(idea.prompt_key) ? (
          <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.1em] text-[#b9b4ee]">
            Question of the day
          </p>
        ) : null}
        {idea.title ? (
          <h2 className="text-balance text-[15px] font-bold leading-snug">
            {full ? (
              idea.title
            ) : (
              <Link href={href} className="outline-none after:absolute after:inset-0">
                {idea.title}
              </Link>
            )}
          </h2>
        ) : null}
        {!idea.title && !full ? (
          <Link
            href={href}
            aria-label="Open this buzz"
            className="absolute inset-0 rounded-[inherit] outline-none"
          />
        ) : null}
        {idea.body ? (
          <p
            className={cn(
              "whitespace-pre-line text-[14px] leading-relaxed text-ink/85",
              idea.title && "mt-1",
              !full && "line-clamp-3",
            )}
          >
            {idea.body}
          </p>
        ) : null}
      </div>
      {idea.poll ? <IdeaPoll idea={idea} space={slug} onChange={onChange} /> : null}
      <footer className="relative z-10 flex items-center gap-1.5">
        <VoteButtons idea={idea} space={slug} onChange={onChange} />
        {full ? (
          <span className="inline-flex h-7 items-center gap-1 px-2 text-[12.5px] font-semibold text-ink-muted">
            <MessageCircleIcon aria-hidden="true" className="size-[15px]" />
            {idea.comment_count}
          </span>
        ) : (
          <Link
            href={href}
            aria-label={`${idea.comment_count} comments`}
            className="inline-flex h-7 items-center gap-1 rounded-full px-2 text-[12.5px] font-semibold text-ink-muted outline-none transition-[background-color,color] duration-150 hover:bg-white/10 hover:text-ink focus-visible:ring-2 focus-visible:ring-ring"
          >
            <MessageCircleIcon aria-hidden="true" className="size-[15px]" />
            {idea.comment_count}
          </Link>
        )}
        <div className="ml-auto">
          <ShareButton idea={idea} space={slug} />
        </div>
      </footer>
    </article>
  );
}
