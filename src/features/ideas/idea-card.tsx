"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowDownIcon, ArrowUpIcon, CheckIcon, MessageCircleIcon, ShareIcon } from "lucide-react";
import { cn } from "cn";
import { Avatar } from "@/components/app/avatar";
import { api, type Idea, type IdeaTopic } from "@/lib/api/endpoints";
import { timeAgo } from "@/lib/time-ago";
import { useCollege } from "@/features/college";
import { primeLoad } from "@/lib/use-load";

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
 * The vote pill. It answers at once (the number and the colour change before the server replies) and goes back if the
 * server says no. Pressing the same arrow again takes the vote back.
 */
export function VoteButtons({ idea, onChange }: { idea: Idea; onChange?: (next: Idea) => void }) {
  const { slug } = useCollege();
  // What I did on this screen (a vote not yet confirmed, or confirmed). It only counts while the idea it was made on is
  // still the one shown, so a fresh answer from the server (a reload) replaces it.
  const from = `${idea.my_vote}:${idea.score}`;
  const [local, setLocal] = React.useState<{ mine: number; score: number; from: string } | null>(
    null,
  );
  const [pop, setPop] = React.useState(0);
  const [failed, setFailed] = React.useState(false);
  const current = local && local.from === from ? local : null;
  const mine = current?.mine ?? idea.my_vote;
  const score = current?.score ?? idea.score;

  async function vote(value: 1 | -1) {
    const next = mine === value ? 0 : value;
    setLocal({ mine: next, score: score - mine + next, from });
    setFailed(false);
    if (next === 1) setPop((n) => n + 1);
    try {
      const saved = await api.ideas.vote(slug, idea.id, next);
      setLocal({ mine: saved.my_vote, score: saved.score, from });
      onChange?.(saved);
    } catch {
      setLocal(null);
      setFailed(true);
    }
  }

  return (
    <div
      className={cn(
        "inline-flex h-9 items-center rounded-full border p-0.5 transition-colors duration-200",
        mine === 1
          ? "border-[#7d74e0]/50 bg-[#7d74e0]/15"
          : mine === -1
            ? "border-white/20 bg-white/[0.08]"
            : "border-white/10 bg-white/[0.05]",
      )}
      role="group"
      aria-label={failed ? "Vote (could not save, try again)" : "Vote"}
    >
      <button
        type="button"
        aria-label="Upvote"
        aria-pressed={mine === 1}
        onClick={() => void vote(1)}
        className={cn(
          "inline-flex size-8 items-center justify-center rounded-full outline-none transition-[background-color,color,transform] duration-200 focus-visible:ring-2 focus-visible:ring-ring active:scale-90",
          mine === 1 ? "bg-brand text-white" : "text-ink-muted hover:bg-white/10 hover:text-ink",
        )}
      >
        <ArrowUpIcon
          key={pop}
          aria-hidden="true"
          className={cn(
            "size-[17px]",
            pop > 0 && mine === 1 && "animate-[pop_0.35s_var(--spring)]",
          )}
        />
      </button>
      <span
        className={cn(
          "tabular min-w-8 px-0.5 text-center text-[13.5px] font-bold",
          mine === 1 && "text-[#b9b4ee]",
        )}
        aria-live="polite"
      >
        {score}
      </span>
      <button
        type="button"
        aria-label="Downvote"
        aria-pressed={mine === -1}
        onClick={() => void vote(-1)}
        className={cn(
          "inline-flex size-8 items-center justify-center rounded-full outline-none transition-[background-color,color,transform] duration-200 focus-visible:ring-2 focus-visible:ring-ring active:scale-90",
          mine === -1 ? "bg-white/15 text-ink" : "text-ink-muted hover:bg-white/10 hover:text-ink",
        )}
      >
        <ArrowDownIcon aria-hidden="true" className="size-[17px]" />
      </button>
    </div>
  );
}

function ShareButton({ idea }: { idea: Idea }) {
  const { slug } = useCollege();
  const [copied, setCopied] = React.useState(false);
  async function share() {
    const url = `${window.location.origin}/c/${slug}/ideas/${idea.id}`;
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
      className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] px-3 text-[13px] font-semibold text-ink-muted outline-none transition-[background-color,color,transform] duration-200 hover:bg-white/10 hover:text-ink focus-visible:ring-2 focus-visible:ring-ring active:scale-95"
    >
      {copied ? (
        <CheckIcon aria-hidden="true" className="size-4 text-success" />
      ) : (
        <ShareIcon aria-hidden="true" className="size-4" />
      )}
      {copied ? "Copied" : null}
    </button>
  );
}

/** One idea in a list or at the top of its page. In a list the text is cut after a few lines and the card opens it. */
export function IdeaCard({
  idea,
  full = false,
  onChange,
}: {
  idea: Idea;
  full?: boolean;
  onChange?: (next: Idea) => void;
}) {
  const { slug } = useCollege();
  const href = `/c/${slug}/ideas/${idea.id}`;
  return (
    <article
      onClickCapture={() => primeLoad(`idea:${slug}:${idea.id}`, idea)}
      className={cn("glass-card relative flex flex-col gap-3 rounded-[24px] p-4", !full && "lift")}
    >
      <header className="flex items-center gap-2.5">
        <Avatar name={idea.author.display_name} size="xs" />
        <div className="min-w-0 flex-1 leading-tight">
          <Link
            href={`/c/${slug}/people/${idea.author.user_id}`}
            className="relative z-10 truncate text-[13.5px] font-semibold hover:underline"
          >
            {idea.author.display_name}
          </Link>
          <p className="truncate text-[12px] text-ink-muted">
            {idea.author.headline ? `${idea.author.headline} · ` : ""}
            {timeAgo(idea.created_at)}
          </p>
        </div>
        <span className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[11.5px] font-semibold text-ink-muted">
          {TOPIC_LABEL[idea.topic]}
        </span>
      </header>
      <div>
        {idea.title ? (
          <h2 className="text-balance text-[1.1rem] font-bold leading-snug">
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
              "whitespace-pre-line text-[14.5px] leading-relaxed text-ink/85",
              idea.title && "mt-1.5",
              !full && "line-clamp-3",
            )}
          >
            {idea.body}
          </p>
        ) : null}
      </div>
      <footer className="relative z-10 flex items-center gap-2">
        <VoteButtons idea={idea} onChange={onChange} />
        {full ? (
          <span className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] px-3 text-[13px] font-semibold text-ink-muted">
            <MessageCircleIcon aria-hidden="true" className="size-4" />
            {idea.comment_count}
          </span>
        ) : (
          <Link
            href={href}
            aria-label={`${idea.comment_count} comments`}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] px-3 text-[13px] font-semibold text-ink-muted outline-none transition-[background-color,color] duration-200 hover:bg-white/10 hover:text-ink focus-visible:ring-2 focus-visible:ring-ring"
          >
            <MessageCircleIcon aria-hidden="true" className="size-4" />
            {idea.comment_count}
          </Link>
        )}
        <div className="ml-auto">
          <ShareButton idea={idea} />
        </div>
      </footer>
    </article>
  );
}
