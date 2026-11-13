"use client";

import * as React from "react";
import Link from "next/link";
import { MessageCircleIcon, SearchIcon, TimerIcon, UsersIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { GlideTabs } from "@/components/app/glide-tabs";
import { Avatar } from "@/components/app/avatar";
import { LoadError } from "@/components/app/load-error";
import { PageHeader } from "@/components/app/page-header";
import { api, type DmThreadItem } from "@/lib/api/endpoints";
import { timeAgo } from "@/lib/time-ago";
import { useLoad } from "@/lib/use-load";
import { useCollege } from "@/features/college";

/** One quiet line: what "disappearing" means here. */
export function DisappearNote({ className }: { className?: string }) {
  return (
    <p
      className={`flex items-center gap-1.5 px-1 text-[12.5px] leading-snug text-ink-muted ${className ?? ""}`}
    >
      <TimerIcon aria-hidden="true" className="size-3.5 shrink-0" />
      Messages disappear 1 hour after they are opened, or after 3 days if never opened.
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
      if (t.message_count === 0) return `No messages right now · ${timeAgo(t.last_at)}`;
      return `${
        t.unread > 0 ? `${t.unread} new ${t.unread === 1 ? "message" : "messages"}` : "Opened"
      } · ${timeAgo(t.last_at)}`;
  }
}

function Row({ thread, slug }: { thread: DmThreadItem; slug: string }) {
  const unread = thread.kind === "chat" && thread.unread > 0;
  const incoming = thread.kind === "request_received";
  return (
    <li>
      <Link
        href={`/c/${slug}/messages/${thread.user_id}`}
        className="lift glass-card flex items-center gap-3.5 rounded-[18px] px-4 py-3 outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="relative shrink-0">
          <Avatar name={thread.display_name} src={thread.avatar_url} size="md" />
          {unread || incoming ? (
            <span
              aria-hidden="true"
              className="bg-brand absolute -right-0.5 -top-0.5 size-3 rounded-full ring-2 ring-[#14141c]"
            />
          ) : null}
        </span>
        <span className="min-w-0 flex-1">
          <span
            className={`block truncate text-[15px] ${unread || incoming ? "font-bold" : "font-semibold"}`}
          >
            {thread.display_name}
          </span>
          <span
            className={`block truncate text-[12.5px] ${unread || incoming ? "font-medium text-ink" : "text-ink-muted"}`}
          >
            {statusLine(thread)}
          </span>
        </span>
        {unread ? (
          <span
            aria-label={`${thread.unread} unread`}
            className="bg-brand tabular min-w-6 rounded-full px-2 py-0.5 text-center text-[12px] font-bold text-white"
          >
            {thread.unread}
          </span>
        ) : null}
        {incoming ? (
          <span className="bg-brand rounded-full px-2.5 py-0.5 text-[11.5px] font-bold text-white">
            Respond
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
  const [query, setQuery] = React.useState("");

  // A new message or request shows up on its own: fetch again every few seconds while the page is open and in front.
  const { reload } = state;
  React.useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") reload();
    }, 8_000);
    const back = () => {
      if (document.visibilityState === "visible") reload();
    };
    document.addEventListener("visibilitychange", back);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", back);
    };
  }, [reload]);

  const all = state.status === "ready" ? state.data : [];
  const requests = all.filter((t) => t.kind !== "chat");
  const chats = all.filter((t) => t.kind === "chat");
  const waiting = requests.filter((t) => t.kind === "request_received").length;
  const unreadChats = chats.reduce((sum, t) => sum + t.unread, 0);
  const term = query.trim().toLowerCase();
  const base = tab === "chats" ? chats : requests;
  const shown = term ? base.filter((t) => t.display_name.toLowerCase().includes(term)) : base;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-3.5 px-4 pt-2 pb-2 md:px-8 md:py-8">
      <PageHeader app title="Messages" />
      <GlideTabs
        label="Messages"
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "chats", label: unreadChats > 0 ? `Chats (${unreadChats})` : "Chats" },
          { value: "requests", label: waiting > 0 ? `Requests (${waiting})` : "Requests" },
        ]}
      />
      {all.length > 6 ? (
        <div className="relative">
          <SearchIcon
            aria-hidden="true"
            className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-ink-muted"
          />
          <Input
            type="search"
            aria-label="Search your messages"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name"
            className="pl-10"
            autoComplete="off"
          />
        </div>
      ) : null}
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
              {term
                ? "Nobody found"
                : tab === "chats"
                  ? "No chats right now"
                  : "No requests right now"}
            </p>
            <p className="max-w-[34ch] text-[14px] text-ink-muted">
              {term
                ? "Try a different name."
                : tab === "chats"
                  ? "Meet someone new. Pick a person in the Network and say hi."
                  : "When someone you have not talked to writes to you, it shows up here. You choose to chat or not."}
            </p>
            {!term && tab === "chats" ? (
              <Button asChild className="mt-1">
                <Link href={`/c/${slug}/people`}>
                  <UsersIcon aria-hidden="true" /> Find people
                </Link>
              </Button>
            ) : null}
          </div>
        ) : (
          <ul key={tab} className="stagger flex flex-col gap-2.5">
            {shown.map((thread) => (
              <Row key={thread.user_id} thread={thread} slug={slug} />
            ))}
          </ul>
        )}
      </div>
      <DisappearNote className="mt-1" />
    </div>
  );
}
