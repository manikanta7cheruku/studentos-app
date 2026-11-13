"use client";

import Link from "next/link";
import { ChevronRightIcon, SparklesIcon, TrophyIcon } from "lucide-react";
import { api } from "@/lib/api/endpoints";
import { promptOfTheDay } from "@/lib/daily-prompts";
import { useLoad } from "@/lib/use-load";
import { useCollege } from "@/features/college";

/**
 * Two reasons to open the app every day, side by side: a question anyone can answer, and the weekly challenge. Both are the
 * same for everybody, so there is always something to join and nobody has to think of what to post.
 */
export function DailyCards() {
  const { slug } = useCollege();
  const prompt = promptOfTheDay();
  const challenge = useLoad(() => api.challenges.current(), []);
  const done = challenge.status === "ready" && challenge.data.my_entry !== null;
  const answers = challenge.status === "ready" ? challenge.data.entries.length : 0;
  return (
    <section aria-label="Today" className="grid gap-3 sm:grid-cols-2">
      <Link
        href={`/c/${slug}/ideas/new?prompt=${prompt.key}`}
        className="lift glass-card group relative flex flex-col gap-2 overflow-hidden rounded-[22px] p-4 outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span
          aria-hidden="true"
          className="bg-brand pointer-events-none absolute -right-8 -top-10 size-28 rounded-full opacity-30 blur-2xl"
        />
        <span className="relative flex items-center gap-1.5 text-[11.5px] font-bold uppercase tracking-[0.1em] text-ink-muted">
          <SparklesIcon aria-hidden="true" className="size-3.5" /> Question of the day
        </span>
        <span className="relative text-[15.5px] font-bold leading-snug">{prompt.text}</span>
        <span className="relative mt-auto inline-flex items-center gap-0.5 text-[13px] font-semibold text-[#b9b4ee]">
          Answer it
          <ChevronRightIcon
            aria-hidden="true"
            className="size-4 transition-transform duration-200 group-hover:translate-x-0.5"
          />
        </span>
      </Link>
      <Link
        href={`/c/${slug}/challenges`}
        className="lift glass-card group relative flex flex-col gap-2 overflow-hidden rounded-[22px] p-4 outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-8 -top-10 size-28 rounded-full bg-[#e0866a] opacity-25 blur-2xl"
        />
        <span className="relative flex items-center gap-1.5 text-[11.5px] font-bold uppercase tracking-[0.1em] text-ink-muted">
          <TrophyIcon aria-hidden="true" className="size-3.5" /> This week&apos;s challenge
        </span>
        <span className="relative text-[15.5px] font-bold leading-snug">
          {challenge.status === "ready" ? challenge.data.title : "Loading…"}
        </span>
        <span className="relative mt-auto flex items-center justify-between text-[13px]">
          <span className="text-ink-muted">
            {done
              ? "You did it. Thank you."
              : `${answers} ${answers === 1 ? "answer" : "answers"} so far`}
          </span>
          <span className="inline-flex items-center gap-0.5 font-semibold text-[#b9b4ee]">
            {done ? "See" : "Join"}
            <ChevronRightIcon
              aria-hidden="true"
              className="size-4 transition-transform duration-200 group-hover:translate-x-0.5"
            />
          </span>
        </span>
      </Link>
    </section>
  );
}
