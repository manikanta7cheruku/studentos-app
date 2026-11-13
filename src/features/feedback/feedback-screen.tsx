"use client";

import * as React from "react";
import Link from "next/link";
import {
  BugIcon,
  CheckIcon,
  LightbulbIcon,
  MessageSquareIcon,
  SendIcon,
  XIcon,
} from "lucide-react";
import { cn } from "cn";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/app/page-header";
import { Spinner } from "@/components/app/spinner";
import { ApiError, friendlyMessage } from "@/lib/api-client";
import { api } from "@/lib/api/endpoints";
import { useCollege } from "@/features/college";

type Kind = "idea" | "problem" | "other";
const KINDS: {
  value: Kind;
  label: string;
  text: string;
  icon: React.ReactNode;
  hint: string;
}[] = [
  {
    value: "idea",
    label: "An idea",
    text: "Something to build",
    icon: <LightbulbIcon />,
    hint: "What would make StudentOS better for you?",
  },
  {
    value: "problem",
    label: "A problem",
    text: "Something is wrong",
    icon: <BugIcon />,
    hint: "What did you tap, and what happened instead? Name the page if you can.",
  },
  {
    value: "other",
    label: "Something else",
    text: "A thought or a thanks",
    icon: <MessageSquareIcon />,
    hint: "Say whatever is on your mind.",
  },
];
const MAX = 1500;
const MIN = 5;
const DRAFT = "studentos.feedback.draft";

function readDraft(): { kind: Kind; message: string } | null {
  try {
    const raw = window.localStorage.getItem(DRAFT);
    if (!raw) return null;
    const value = JSON.parse(raw) as { kind?: Kind; message?: string };
    return value.message ? { kind: value.kind ?? "idea", message: value.message } : null;
  } catch {
    return null;
  }
}
function saveDraft(kind: Kind, message: string) {
  try {
    if (message.trim()) window.localStorage.setItem(DRAFT, JSON.stringify({ kind, message }));
    else window.localStorage.removeItem(DRAFT);
  } catch {
    // Storage can be blocked. The note simply is not remembered then.
  }
}

/** A short note to the team. It goes to the owner dashboard; nobody else sees it. A half written note is kept on this device. */
export function FeedbackScreen() {
  const { slug } = useCollege();
  const [kind, setKind] = React.useState<Kind>("idea");
  const [message, setMessage] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [problem, setProblem] = React.useState<string | undefined>();
  const [sent, setSent] = React.useState(false);
  const [restored, setRestored] = React.useState(false);
  // The screen the person came from, so we know what they were talking about. They can leave it out.
  const [from, setFrom] = React.useState<string | undefined>(() => {
    try {
      return document.referrer ? new URL(document.referrer).pathname.slice(0, 200) : undefined;
    } catch {
      return undefined;
    }
  });

  // Bring back a note that was started earlier (after the first paint, so the page matches the server).
  React.useEffect(() => {
    const draft = readDraft();
    if (!draft) return;
    const frame = window.requestAnimationFrame(() => {
      setKind(draft.kind);
      setMessage(draft.message);
      setRestored(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  function change(nextKind: Kind, nextMessage: string) {
    setKind(nextKind);
    setMessage(nextMessage);
    saveDraft(nextKind, nextMessage);
  }

  const length = message.trim().length;
  const hint = KINDS.find((item) => item.value === kind)!.hint;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    if (length < MIN) {
      setProblem("Write at least a few words.");
      return;
    }
    setProblem(undefined);
    setBusy(true);
    setError(null);
    try {
      await api.feedback.send({ kind, message: message.trim(), ...(from ? { page: from } : {}) });
      saveDraft(kind, "");
      setSent(true);
    } catch (caught) {
      setError(
        caught instanceof ApiError && caught.code === "RATE_LIMITED"
          ? "You sent a lot today. Please try again tomorrow."
          : friendlyMessage(caught, "We could not send that. Please try again."),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 pt-2 pb-2 md:px-8 md:py-8">
      <PageHeader title="Send feedback" back={{ href: `/c/${slug}/me`, label: "You" }} />
      {sent ? (
        <div className="glass-card flex flex-col items-center gap-3 rounded-[24px] px-6 py-12 text-center">
          <span className="inline-flex size-14 animate-in zoom-in-50 fade-in-0 items-center justify-center rounded-full bg-[#2fb98a]/20 text-[#5fd6ad] duration-500">
            <CheckIcon aria-hidden="true" className="size-7" />
          </span>
          <p className="text-lg font-bold">Thank you</p>
          <p className="max-w-[34ch] text-[14px] text-ink-muted">
            Your note reached the team, and we read every one. Because of notes like yours, the app
            keeps getting better.
          </p>
          <div className="mt-1 flex flex-wrap justify-center gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setSent(false);
                setMessage("");
                setRestored(false);
              }}
            >
              Send another
            </Button>
            <Button asChild variant="ghost">
              <Link href={`/c/${slug}/me`}>Back to You</Link>
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="flex flex-col gap-4">
          <p className="px-1 text-[14px] text-ink-muted">
            Tell us what to build, what broke, or what feels off. We read every note.
          </p>
          <div role="radiogroup" aria-label="Kind of feedback" className="grid grid-cols-3 gap-2.5">
            {KINDS.map((item) => {
              const on = kind === item.value;
              return (
                <button
                  key={item.value}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => change(item.value, message)}
                  className={cn(
                    "flex flex-col items-start gap-2 rounded-[18px] border p-3 text-left outline-none transition-[background-color,border-color,transform] duration-200 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98] motion-reduce:transition-none",
                    on
                      ? "border-[#8f86f0]/70 bg-[#8f86f0]/15"
                      : "border-white/10 bg-white/[0.04] hover:border-white/25",
                  )}
                >
                  <span
                    className={cn(
                      "inline-flex size-9 items-center justify-center rounded-xl [&_svg]:size-[18px]",
                      on ? "bg-brand text-white" : "bg-white/10 text-ink-muted",
                    )}
                  >
                    {item.icon}
                  </span>
                  <span>
                    <span className="block text-[13.5px] font-bold leading-tight">
                      {item.label}
                    </span>
                    <span className="block text-[11.5px] leading-snug text-ink-muted">
                      {item.text}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="feedback-note" className="sr-only">
              Your note
            </label>
            <div className="glass-card rounded-[20px] p-1 transition-[box-shadow] duration-200 focus-within:shadow-[0_0_0_3px_rgba(143,134,240,0.22)]">
              <textarea
                id="feedback-note"
                value={message}
                onChange={(event) => change(kind, event.target.value)}
                maxLength={MAX}
                rows={5}
                placeholder={hint}
                aria-invalid={problem ? true : undefined}
                className="min-h-[8rem] w-full resize-none bg-transparent px-3.5 py-3 text-[16px] leading-relaxed outline-none placeholder:text-ink-muted/70 md:text-[14.5px]"
              />
            </div>
            <div className="flex items-center justify-between gap-3 px-1 text-[12px]">
              <span className={problem ? "font-medium text-danger" : "text-ink-muted"}>
                {problem ??
                  (restored && length > 0
                    ? "Your earlier note is back."
                    : "Only the team sees this.")}
              </span>
              <span
                className={cn(
                  "tabular",
                  message.length > MAX - 100 ? "text-[#f0a58c]" : "text-ink-muted",
                )}
              >
                {message.length}/{MAX}
              </span>
            </div>
          </div>

          {from ? (
            <p className="flex items-center gap-2 px-1 text-[12.5px] text-ink-muted">
              <span className="min-w-0 truncate">
                Sent with the page you came from: <span className="text-ink">{from}</span>
              </span>
              <button
                type="button"
                onClick={() => setFrom(undefined)}
                aria-label="Leave the page out"
                className="inline-flex size-6 shrink-0 items-center justify-center rounded-full hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-ring"
              >
                <XIcon aria-hidden="true" className="size-3.5" />
              </button>
            </p>
          ) : null}

          {error ? (
            <Banner variant="error">
              <p>{error}</p>
            </Banner>
          ) : null}
          <Button type="submit" size="lg" disabled={busy || length < MIN}>
            {busy ? <Spinner /> : <SendIcon aria-hidden="true" />} Send to the team
          </Button>
        </form>
      )}
    </div>
  );
}
