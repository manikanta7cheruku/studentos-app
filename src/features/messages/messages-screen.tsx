"use client";

import * as React from "react";
import Link from "next/link";
import { MessageCircleIcon, TimerIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar } from "@/components/app/avatar";
import { LoadError } from "@/components/app/load-error";
import { PageHeader } from "@/components/app/page-header";
import { api, type DmThreadItem } from "@/lib/api/endpoints";
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

function whenLeft(iso: string | null): string {
  if (!iso) return "";
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "today";
  const days = Math.ceil(ms / 86_400_000);
  return days <= 1 ? "in 1 day" : `in ${days} days`;
}

/** The line under a name: how the conversation stands. */
function statusLine(t: DmThreadItem): string {
  switch (t.kind) {
    case "request_received":
      return `Wants to chat · ${timeAgo(t.last_at)}`;
    case "request_sent":
      return `Waiting for a reply · runs out ${whenLeft(t.expires_at)}`;
    case "declined":
      return `Not available right now${t.can_request_again_at ? ` · you can ask again ${whenLeft(t.can_request_again_at)}` : ""}`;
    case "expired":
      return "No reply yet · you can send a new request";
    default:
      return `${
        t.unread > 0 ? `${t.unread} new ${t.unread === 1 ? "message" : "messages"}` : "Opened"
      } · ${timeAgo(t.last_at)}`;
  }
}

function Row({ thread, slug }: { thread: DmThreadItem; slug: string }) {
  return (
    <li>
      <Link
        href={`/c/${slug}/messages/${thread.user_id}`}
        className="lift glass-card flex items-center gap-3.5 rounded-[18px] px-4 py-3 outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Avatar name={thread.display_name} src={thread.avatar_url} size="md" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-semibold">{thread.display_name}</span>
          <span className="block text-[12.5px] text-ink-muted">{statusLine(thread)}</span>
        </span>
        {thread.kind === "chat" && thread.unread > 0 ? (
          <span
            aria-hidden="true"
            className="bg-brand tabular min-w-6 rounded-full px-2 py-0.5 text-center text-[12px] font-bold text-white"
          >
            {thread.unread}
          </span>
        ) : null}
        {thread.kind === "request_received" ? (
          <span className="bg-brand rounded-full px-2.5 py-0.5 text-[11.5px] font-bold text-white">
            New
          </span>
        ) : null}
      </Link>
    </li>
  );
}

/** My conversations. Only how many messages are waiting is shown, never the words. Requests sit in their own tab. */
export function MessagesScreen() {
  const { slug } = useCollege();
  const state = useLoad(() => api.messages.threads(slug), [slug]);
  const [tab, setTab] = React.useState<"chats" | "requests">("chats");
  const all = state.status === "ready" ? state.data : [];
  const requests = all.filter((t) => t.kind !== "chat");
  const chats = all.filter((t) => t.kind === "chat");
  const waiting = requests.filter((t) => t.kind === "request_received").length;
  const shown = tab === "chats" ? chats : requests;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 pt-2 pb-2 md:px-8 md:py-8">
      <PageHeader
        app
        title="Messages"
        description="Private notes between classmates. They disappear after they are read."
      />
      <DisappearNote />
      <div role="tablist" aria-label="Messages" className="glass-clear flex gap-1 rounded-full p-1">
        {(
          [
            ["chats", "Chats", 0],
            ["requests", "Requests", waiting],
          ] as const
        ).map(([id, label, n]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`flex-1 rounded-full px-4 py-2 text-[14px] font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              tab === id ? "bg-brand text-white" : "text-ink-muted"
            }`}
          >
            {label}
            {n > 0 ? ` (${n})` : ""}
          </button>
        ))}
      </div>
      <div aria-live="polite">
        {state.status === "loading" ? (
          <div aria-busy="true" className="flex flex-col gap-3">
            {[0, 1, 2].map((n) => (
              <Skeleton key={n} className="h-16 w-full rounded-[18px]" />
            ))}
          </div>
        ) : state.status === "error" ? (
          <LoadError error={state.error} onRetry={state.reload} what="your messages" />
        ) : shown.length === 0 ? (
          <div className="glass-card flex flex-col items-center gap-3 rounded-[24px] px-6 py-12 text-center">
            <span className="bg-brand inline-flex size-12 items-center justify-center rounded-2xl text-white">
              <MessageCircleIcon aria-hidden="true" className="size-6" />
            </span>
            <p className="text-lg font-bold">
              {tab === "chats" ? "No chats right now" : "No requests right now"}
            </p>
            <p className="max-w-[34ch] text-[14px] text-ink-muted">
              {tab === "chats"
                ? "Say hi to someone from the Network tab or the people suggested on Home. Old messages vanish by themselves."
                : "When someone you have not talked to writes to you, it shows up here. You choose to chat or not."}
            </p>
          </div>
        ) : (
          <ul className="stagger flex flex-col gap-2.5">
            {shown.map((thread) => (
              <Row key={thread.user_id} thread={thread} slug={slug} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
