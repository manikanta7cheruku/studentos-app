"use client";

import * as React from "react";
import Link from "next/link";
import { SendIcon, VenetianMaskIcon } from "lucide-react";
import { cn } from "cn";
import { Avatar } from "@/components/app/avatar";
import { GlassSheet } from "@/components/app/glass-sheet";
import { Spinner } from "@/components/app/spinner";
import { ApiError, friendlyMessage } from "@/lib/api-client";
import { api, type IdeaTopic } from "@/lib/api/endpoints";
import { useAttempt } from "@/lib/use-attempt";
import { useCollege } from "@/features/college";
import { TOPICS, TOPIC_LABEL } from "./idea-card";

const MAX = 280;

/**
 * A one-line way to post at the top of the Buzz list ("What is on your mind?"). Tapping it opens a glass sheet with the box, a
 * topic, an anonymous switch and a Post button. The line itself never changes size, so the list under it never has to move
 * (growing the box in place made the whole page re-lay out on every frame, which is what felt laggy). The sheet slides with a
 * transform only, the same way every other sheet in the app does. Polls and long posts go through the full page ("More options").
 */
export function QuickPost({ onPosted }: { onPosted: () => void }) {
  const { slug, profile } = useCollege();
  const attempt = useAttempt();
  const [open, setOpen] = React.useState(false);
  const [text, setText] = React.useState("");
  const [topic, setTopic] = React.useState<IdeaTopic>("other");
  const [anonymous, setAnonymous] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);
  const [typing, setTypingNow] = React.useState(false);
  const area = React.useRef<HTMLTextAreaElement>(null);
  const leave = React.useRef<number | null>(null);

  // The box has the keyboard: the sheet rises to the top with it, and settles back a moment after the focus leaves.
  const setTyping = (next: boolean) => {
    if (leave.current !== null) window.clearTimeout(leave.current);
    leave.current = null;
    if (next) setTypingNow(true);
    else leave.current = window.setTimeout(() => setTypingNow(false), 220);
  };
  React.useEffect(
    () => () => {
      if (leave.current !== null) window.clearTimeout(leave.current);
    },
    [],
  );
  // Put the cursor in the box as the sheet arrives.
  React.useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => area.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  async function post(event?: React.FormEvent) {
    event?.preventDefault();
    const body = text.trim();
    if (!body || busy) return;
    setBusy(true);
    setError(null);
    try {
      await api.ideas.create(slug, { title: "", body, topic, anonymous }, attempt.get());
      attempt.reset();
      setText("");
      setAnonymous(false);
      setTopic("other");
      setOpen(false);
      setDone(true);
      window.setTimeout(() => setDone(false), 2500);
      onPosted();
    } catch (caught) {
      if (!(caught instanceof ApiError && caught.isOffline)) attempt.reset();
      setError(
        caught instanceof ApiError && caught.code === "RATE_LIMITED"
          ? "You have posted a lot today. Try again a little later."
          : friendlyMessage(caught, "We could not post that. Please try again."),
      );
    } finally {
      setBusy(false);
    }
  }

  const name = profile?.display_name ?? "You";
  return (
    <>
      <div className="glass-card flex items-center gap-3 rounded-[20px] p-3">
        <Avatar name={name} src={profile?.avatar_url ?? null} size="sm" />
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          className="flex h-9 min-w-0 flex-1 cursor-pointer items-center rounded-full bg-white/[0.06] px-4 text-left text-[16px] leading-5 outline-none transition-colors duration-200 hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-ring md:text-[14.5px]"
        >
          <span className={cn("truncate", text.trim() && !done ? "text-ink" : "text-ink-muted/70")}>
            {done ? "Posted. Share another?" : text.trim() ? text : "What is on your mind?"}
          </span>
        </button>
      </div>

      <GlassSheet open={open} onOpenChange={setOpen} title="New buzz" typing={typing}>
        <form onSubmit={post} className="flex min-h-0 flex-1 flex-col gap-3">
          <div className="pro-scroll -mx-1 min-h-0 flex-1 overflow-y-auto overscroll-contain px-1 pt-1">
            <label htmlFor="quick-buzz" className="sr-only">
              Your buzz
            </label>
            <textarea
              id="quick-buzz"
              ref={area}
              value={text}
              onChange={(event) => setText(event.target.value)}
              onFocus={() => setTyping(true)}
              onBlur={() => setTyping(false)}
              maxLength={MAX}
              rows={5}
              placeholder="What is on your mind?"
              className="glass-field w-full resize-none rounded-[14px] p-3 text-[16px] leading-6 outline-none placeholder:text-ink-muted/70 md:text-[14.5px]"
            />
            <div
              role="group"
              aria-label="Topic"
              className="no-scrollbar -mx-1 mt-3 flex gap-1.5 overflow-x-auto px-1"
            >
              {TOPICS.map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={topic === value}
                  onClick={() => setTopic(value)}
                  className={cn(
                    "inline-flex h-8 shrink-0 items-center rounded-full border px-3 text-[12.5px] font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                    topic === value
                      ? "border-white/25 bg-white/[0.14] text-ink"
                      : "border-white/10 text-ink-muted hover:text-ink",
                  )}
                >
                  {TOPIC_LABEL[value]}
                </button>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-3">
              <button
                type="button"
                aria-pressed={anonymous}
                onClick={() => setAnonymous((value) => !value)}
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[12.5px] font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                  anonymous
                    ? "border-white/25 bg-white/[0.14] text-ink"
                    : "border-white/10 text-ink-muted hover:text-ink",
                )}
              >
                <VenetianMaskIcon aria-hidden="true" className="size-3.5" /> Anonymous
              </button>
              <Link
                href={`/c/${slug}/ideas/new`}
                className="whitespace-nowrap text-[12.5px] font-semibold text-[#b9b4ee] hover:underline"
              >
                More options
              </Link>
              <span className="tabular ml-auto shrink-0 text-[11.5px] text-ink-muted">
                {text.length}/{MAX}
              </span>
            </div>
            {error ? <p className="mt-3 text-[13px] text-danger">{error}</p> : null}
          </div>
          <div className="flex gap-2.5">
            <button
              type="button"
              className="profile-btn flex-1"
              onClick={() => {
                setOpen(false);
                setText("");
                setError(null);
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy || !text.trim()}
              className="profile-btn profile-btn-primary flex-[2] disabled:opacity-50"
            >
              {busy ? <Spinner /> : <SendIcon aria-hidden="true" />} Post
            </button>
          </div>
        </form>
      </GlassSheet>
    </>
  );
}
