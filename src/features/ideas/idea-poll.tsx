"use client";

import * as React from "react";
import { CheckIcon } from "lucide-react";
import { cn } from "cn";
import { api, type Idea } from "@/lib/api/endpoints";

/**
 * The poll of a buzz. Tap an option to vote (tap another to change). The bars show the share of each option, filling in at
 * once and going back if the server says no. Counts are open to everybody, so a poll is also a quick feel for what people
 * think.
 */
export function IdeaPoll({
  idea,
  space,
  onChange,
}: {
  idea: Idea;
  space: string;
  onChange?: (next: Idea) => void;
}) {
  const poll = idea.poll;
  const [pending, setPending] = React.useState<number | null>(null);
  const [failed, setFailed] = React.useState(false);
  if (!poll) return null;

  // Show my tap at once: my pick moves, and the counts follow it.
  const mine = pending ?? poll.my_option;
  const counts = poll.options.map((option, index) => {
    let votes = option.votes;
    if (pending !== null) {
      if (index === pending) votes += 1;
      if (poll.my_option === index) votes -= 1;
    }
    return votes;
  });
  const total = counts.reduce((sum, value) => sum + value, 0);

  async function vote(option: number) {
    if (mine === option) return;
    setPending(option);
    setFailed(false);
    try {
      const saved = await api.ideas.pollVote(space, idea.id, option);
      onChange?.(saved);
    } catch {
      setFailed(true);
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="relative z-10 mt-2 flex flex-col gap-2" role="group" aria-label="Poll">
      {poll.options.map((option, index) => {
        const share = total ? Math.round((counts[index]! / total) * 100) : 0;
        const picked = mine === index;
        return (
          <button
            key={`${index}-${option.text}`}
            type="button"
            onClick={() => void vote(index)}
            aria-pressed={picked}
            className={cn(
              "relative flex min-h-11 w-full items-center justify-between gap-3 overflow-hidden rounded-[14px] border px-3.5 text-left outline-none transition-[border-color,transform] duration-150 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.99]",
              picked ? "border-[#8f86f0]/70" : "border-white/10 hover:border-white/25",
            )}
          >
            {/* The bar behind the words. It only shows once someone has voted. */}
            <span
              aria-hidden="true"
              style={{ width: mine !== null ? `${share}%` : "0%" }}
              className={cn(
                "absolute inset-y-0 left-0 transition-[width] duration-500 ease-out",
                picked ? "bg-brand opacity-40" : "bg-white/[0.09]",
              )}
            />
            <span className="relative flex min-w-0 items-center gap-2 text-[14px] font-semibold">
              {picked ? <CheckIcon aria-hidden="true" className="size-4 shrink-0" /> : null}
              <span className="truncate">{option.text}</span>
            </span>
            {mine !== null ? (
              <span className="tabular relative shrink-0 text-[13px] font-bold">{share}%</span>
            ) : null}
          </button>
        );
      })}
      <p className="text-[12px] text-ink-muted" aria-live="polite">
        {failed
          ? "We could not save your vote. Try again."
          : `${total} ${total === 1 ? "vote" : "votes"}${mine === null ? " · tap to vote" : ""}`}
      </p>
    </div>
  );
}
