"use client";

import * as React from "react";
import Link from "next/link";
import { BanIcon, CheckIcon, ChevronLeftIcon, FlagIcon, LockIcon, SendIcon } from "lucide-react";
import { cn } from "cn";
import { Banner } from "@/components/ui/banner";
import { OverflowMenu } from "@/components/app/overflow-menu";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar } from "@/components/app/avatar";
import { LoadError } from "@/components/app/load-error";
import { Spinner } from "@/components/app/spinner";
import { ApiError, friendlyMessage } from "@/lib/api-client";
import { api } from "@/lib/api/endpoints";
import { useAttempt } from "@/lib/use-attempt";
import { useLoad } from "@/lib/use-load";
import { useCollege } from "@/features/college";
import { ReportConversation } from "./report-conversation";
import { DisappearNote } from "./messages-screen";

/** "in 52 min", "in 3 days", "any moment": when a message disappears. */
function leaves(iso: string, now: number): string {
  const ms = new Date(iso).getTime() - now;
  if (ms <= 60_000) return "any moment";
  const minutes = Math.round(ms / 60_000);
  if (minutes < 90) return `in ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 36) return `in ${hours} h`;
  return `in ${Math.round(hours / 24)} days`;
}

const POLL_MS = 10_000;

/**
 * One conversation. Opening it starts the 1 hour clock on their messages. New messages are fetched every few seconds while the
 * screen is open and visible. Every message says when it will disappear.
 */
export function ThreadScreen({ userId }: { userId: string }) {
  const { slug } = useCollege();
  const attempt = useAttempt();
  const state = useLoad(() => api.messages.thread(slug, userId), [slug, userId]);
  const data = state.status === "ready" ? state.data : null;
  const failed = state.status === "error" ? state.error : null;
  const [now, setNow] = React.useState(() => Date.now());
  const [text, setText] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [blocked, setBlocked] = React.useState(false);
  const [reporting, setReporting] = React.useState(false);
  const bottom = React.useRef<HTMLDivElement>(null);

  const { reload } = state;
  React.useEffect(() => {
    // Fetch again every few seconds while the tab is visible, and tick the "gone in" labels.
    const timer = window.setInterval(() => {
      setNow(Date.now());
      if (document.visibilityState === "visible") reload();
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [reload]);

  const count = data?.messages.length ?? 0;
  React.useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [count]);

  async function send(event: React.FormEvent) {
    event.preventDefault();
    const body = text.trim();
    if (!body || busy) return;
    setBusy(true);
    setError(null);
    try {
      await api.messages.send(slug, userId, body, attempt.get());
      attempt.reset();
      setText("");
      reload();
    } catch (caught) {
      if (!(caught instanceof ApiError && caught.isOffline)) attempt.reset();
      setError(
        caught instanceof ApiError && caught.code === "RATE_LIMITED"
          ? "Slow down a little. Try again in a few minutes."
          : friendlyMessage(caught, "We could not send that. Please try again."),
      );
    } finally {
      setBusy(false);
    }
  }

  async function block() {
    try {
      await api.blocks.block(userId);
      setBlocked(true);
      reload();
    } catch (caught) {
      setError(friendlyMessage(caught, "We could not block them. Please try again."));
    }
  }

  const other = data?.other;
  return (
    <div className="mx-auto flex min-h-[calc(100dvh-8rem)] w-full max-w-2xl flex-col gap-3 px-5 pt-3 pb-2 md:px-8 md:py-8">
      <header className="glass flex items-center gap-1.5 rounded-[22px] p-2">
        <Link
          href={`/c/${slug}/messages`}
          aria-label="Back to messages"
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-full text-ink-muted outline-none transition-colors hover:bg-white/10 hover:text-ink focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ChevronLeftIcon aria-hidden="true" className="size-5" />
        </Link>
        {other ? (
          <Link
            href={`/c/${slug}/people/${other.user_id}`}
            className="flex min-w-0 flex-1 items-center gap-3 rounded-xl py-0.5 outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Avatar name={other.display_name} src={other.avatar_url} size="sm" />
            <span className="min-w-0">
              <span className="block truncate text-[15.5px] font-bold leading-tight">
                {other.display_name}
              </span>
              <span className="block text-[12px] text-ink-muted">View profile</span>
            </span>
          </Link>
        ) : (
          <span className="flex-1" />
        )}
        {other ? (
          <>
            <OverflowMenu
              className="size-10"
              items={[
                {
                  label: "Report " + other.display_name,
                  icon: <FlagIcon aria-hidden="true" />,
                  danger: true,
                  onSelect: () => setReporting(true),
                },
                ...(data?.can_message && !blocked
                  ? [
                      {
                        label: "Block",
                        icon: <BanIcon aria-hidden="true" />,
                        danger: true,
                        onSelect: () => void block(),
                      },
                    ]
                  : []),
              ]}
            />
            <ReportConversation
              userId={userId}
              name={other.display_name}
              open={reporting}
              onOpenChange={setReporting}
            />
          </>
        ) : null}
      </header>

      <DisappearNote />

      <div className="flex flex-1 flex-col gap-2" aria-live="polite">
        {failed && !data ? (
          failed instanceof ApiError && failed.status === 404 ? (
            <div className="glass-card rounded-[22px] p-8">
              <p className="text-lg font-bold">This person is not available.</p>
              <p className="mt-1 text-ink-muted">They may have left the college.</p>
            </div>
          ) : (
            <LoadError error={failed} onRetry={reload} what="this conversation" />
          )
        ) : !data ? (
          <div aria-busy="true" className="flex flex-col gap-2">
            <Skeleton className="h-10 w-2/3 rounded-2xl" />
            <Skeleton className="ml-auto h-10 w-1/2 rounded-2xl" />
          </div>
        ) : data.messages.length === 0 ? (
          <p className="my-6 text-center text-[14px] text-ink-muted">
            {data.can_message
              ? "Nothing here. Say hello. What you write disappears after it is read."
              : "You cannot message this person."}
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {data.messages.map((message) => (
              <li
                key={message.id}
                className={cn("flex", message.mine ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[82%] rounded-[20px] px-3.5 py-2.5 shadow-sm",
                    message.mine ? "bg-brand rounded-br-md text-white" : "glass-card rounded-bl-md",
                  )}
                >
                  <p className="whitespace-pre-wrap break-words text-[14.5px] leading-relaxed">
                    {message.body}
                  </p>
                  <p
                    className={cn(
                      "mt-1 flex items-center gap-1 text-[11px]",
                      message.mine ? "justify-end text-white/80" : "text-ink-muted",
                    )}
                  >
                    {message.mine ? (
                      message.opened_at ? (
                        <>
                          <CheckIcon aria-hidden="true" className="size-3" /> Seen · disappears{" "}
                          {leaves(message.expires_at, now)}
                        </>
                      ) : (
                        "Sent · starts to disappear once seen"
                      )
                    ) : (
                      <>Disappears {leaves(message.expires_at, now)}</>
                    )}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
        <div ref={bottom} />
      </div>

      {error ? (
        <Banner variant="error">
          <p>{error}</p>
        </Banner>
      ) : null}
      {data?.can_message === false || blocked ? (
        <p className="text-center text-[13px] text-ink-muted">
          Messaging is switched off for this person.
        </p>
      ) : (
        <form onSubmit={send} className="glass flex items-end gap-2 rounded-[22px] p-2">
          <label htmlFor="dm-body" className="sr-only">
            Message
          </label>
          <textarea
            id="dm-body"
            value={text}
            onChange={(event) => setText(event.target.value)}
            maxLength={500}
            rows={1}
            placeholder="Write a message"
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void send(event);
              }
            }}
            className="max-h-32 min-h-10 flex-1 resize-none bg-transparent px-3 py-2 text-[14.5px] outline-none placeholder:text-ink-muted/70"
          />
          <Button type="submit" size="icon-sm" disabled={busy || !text.trim()} aria-label="Send">
            {busy ? <Spinner /> : <SendIcon aria-hidden="true" />}
          </Button>
        </form>
      )}
      <p className="flex items-start justify-center gap-1.5 px-2 text-center text-[12px] leading-snug text-ink-muted">
        <LockIcon aria-hidden="true" className="mt-0.5 size-3 shrink-0" />
        <span>
          Messages cannot be edited or unsent. They disappear 1 hour after the other person sees
          them.
        </span>
      </p>
    </div>
  );
}
