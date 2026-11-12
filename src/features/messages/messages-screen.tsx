"use client";

import * as React from "react";
import Link from "next/link";
import { MessageCircleIcon, TimerIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar } from "@/components/app/avatar";
import { LoadError } from "@/components/app/load-error";
import { PageHeader } from "@/components/app/page-header";
import { api } from "@/lib/api/endpoints";
import { timeAgo } from "@/lib/time-ago";
import { useLoad } from "@/lib/use-load";
import { useCollege } from "@/features/college";

/** The explanation people see once: what "disappearing" means here, in plain words. */
export function DisappearNote({ className }: { className?: string }) {
  return (
    <p
      className={`flex items-start gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-[12.5px] leading-snug text-ink-muted ${className ?? ""}`}
    >
      <TimerIcon aria-hidden="true" className="mt-px size-4 shrink-0" />
      <span>
        Messages disappear <b className="text-ink">1 hour after they are opened</b>, or after 3 days
        if they are never opened. Anyone can still take a screenshot, so only share what you are
        fine with.
      </span>
    </p>
  );
}

/** My conversations. Only how many messages are waiting is shown, never the words. */
export function MessagesScreen() {
  const { slug } = useCollege();
  const state = useLoad(() => api.messages.threads(slug), [slug]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-5 pt-4 pb-2 md:px-8 md:py-8">
      <PageHeader
        app
        title="Messages"
        description="Private notes between classmates. They disappear after they are read."
      />
      <DisappearNote />
      <div aria-live="polite">
        {state.status === "loading" ? (
          <div aria-busy="true" className="flex flex-col gap-3">
            {[0, 1, 2].map((n) => (
              <Skeleton key={n} className="h-16 w-full rounded-[18px]" />
            ))}
          </div>
        ) : state.status === "error" ? (
          <LoadError error={state.error} onRetry={state.reload} what="your messages" />
        ) : state.data.length === 0 ? (
          <div className="glass-card flex flex-col items-center gap-3 rounded-[24px] px-6 py-12 text-center">
            <span className="bg-brand inline-flex size-12 items-center justify-center rounded-2xl text-white">
              <MessageCircleIcon aria-hidden="true" className="size-6" />
            </span>
            <p className="text-lg font-bold">No messages right now</p>
            <p className="max-w-[32ch] text-[14px] text-ink-muted">
              Open a classmate&rsquo;s profile or a plan you joined and tap Message to start. Old
              messages vanish by themselves.
            </p>
          </div>
        ) : (
          <ul className="stagger flex flex-col gap-2.5">
            {state.data.map((thread) => (
              <li key={thread.user_id}>
                <Link
                  href={`/c/${slug}/messages/${thread.user_id}`}
                  className="lift glass-card flex items-center gap-3.5 rounded-[18px] px-4 py-3 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Avatar name={thread.display_name} src={thread.avatar_url} size="md" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-semibold">
                      {thread.display_name}
                    </span>
                    <span className="block text-[12.5px] text-ink-muted">
                      {thread.unread > 0
                        ? `${thread.unread} new ${thread.unread === 1 ? "message" : "messages"}`
                        : "Opened"}{" "}
                      · {timeAgo(thread.last_at)}
                    </span>
                  </span>
                  {thread.unread > 0 ? (
                    <span
                      aria-hidden="true"
                      className="bg-brand tabular min-w-6 rounded-full px-2 py-0.5 text-center text-[12px] font-bold text-white"
                    >
                      {thread.unread}
                    </span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
