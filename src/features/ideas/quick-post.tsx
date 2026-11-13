"use client";

import * as React from "react";
import Link from "next/link";
import { SendIcon, VenetianMaskIcon } from "lucide-react";
import { cn } from "cn";
import { Avatar } from "@/components/app/avatar";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/app/spinner";
import { ApiError, friendlyMessage } from "@/lib/api-client";
import { api, type IdeaTopic } from "@/lib/api/endpoints";
import { useAttempt } from "@/lib/use-attempt";
import { useCollege } from "@/features/college";
import { TOPICS, TOPIC_LABEL } from "./idea-card";

const MAX = 280;

/**
 * A one-box way to post at the top of the Buzz list. It starts as a single line ("What is on your mind?") and opens on tap
 * with a topic, an anonymous switch and a Post button. Polls and long posts go through the full page ("More options").
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
  const area = React.useRef<HTMLTextAreaElement>(null);
  const box = React.useRef<HTMLFormElement>(null);

  // Tapping anywhere outside, or Escape, folds it back. A half written buzz stays in the box.
  React.useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (box.current && !box.current.contains(event.target as Node)) setOpen(false);
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", key);
    };
  }, [open]);

  async function post(event: React.FormEvent) {
    event.preventDefault();
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
      area.current?.blur();
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
    <form
      ref={box}
      onSubmit={post}
      className="glass-card flex flex-col gap-3 rounded-[20px] p-3 transition-[box-shadow] duration-200 focus-within:shadow-[0_0_0_3px_rgba(143,134,240,0.18)]"
    >
      <div className="flex items-start gap-3">
        <Avatar name={name} src={profile?.avatar_url ?? null} size="sm" />
        <label htmlFor="quick-buzz" className="sr-only">
          Your buzz
        </label>
        <textarea
          id="quick-buzz"
          ref={area}
          value={text}
          onChange={(event) => setText(event.target.value)}
          onFocus={() => setOpen(true)}
          maxLength={MAX}
          rows={1}
          placeholder={done ? "Posted. Share another?" : "What is on your mind?"}
          className={cn(
            "flex-1 resize-none overflow-hidden bg-transparent text-[16px] outline-none transition-[height,background-color,padding,border-radius] duration-300 ease-out placeholder:text-ink-muted/70 motion-reduce:transition-none md:text-[14.5px]",
            open
              ? "h-24 rounded-xl px-1 pt-1.5"
              : "h-9 cursor-pointer rounded-full bg-white/[0.06] px-4 pt-[7px] hover:bg-white/10",
          )}
        />
      </div>
      <div
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none",
          open ? "grid-rows-[1fr] opacity-100" : "pointer-events-none grid-rows-[0fr] opacity-0",
        )}
        aria-hidden={!open}
        inert={!open}
      >
        <div className="flex min-h-0 flex-col gap-3 overflow-hidden">
          <div
            role="group"
            aria-label="Topic"
            className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1"
          >
            {TOPICS.map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={topic === value}
                onClick={() => setTopic(value)}
                className={cn(
                  "inline-flex h-7 shrink-0 items-center rounded-full border px-3 text-[12px] font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                  topic === value
                    ? "bg-brand border-transparent text-white"
                    : "border-white/10 text-ink-muted hover:text-ink",
                )}
              >
                {TOPIC_LABEL[value]}
              </button>
            ))}
          </div>
          {error ? <p className="text-[13px] text-danger">{error}</p> : null}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
            <button
              type="button"
              aria-pressed={anonymous}
              onClick={() => setAnonymous((value) => !value)}
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[12.5px] font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                anonymous
                  ? "border-transparent bg-white/15 text-ink"
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
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setOpen(false);
                setText("");
                setError(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={busy || !text.trim()}>
              {busy ? <Spinner /> : <SendIcon aria-hidden="true" />} Post
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
