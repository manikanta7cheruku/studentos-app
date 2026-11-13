"use client";

import * as React from "react";
import Link from "next/link";
import { CheckIcon, SendIcon, XIcon } from "lucide-react";
import { cn } from "cn";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { GlideTabs } from "@/components/app/glide-tabs";
import { PageHeader } from "@/components/app/page-header";
import { Spinner } from "@/components/app/spinner";
import { ApiError, friendlyMessage } from "@/lib/api-client";
import { api } from "@/lib/api/endpoints";
import { useCollege } from "@/features/college";

type Kind = "idea" | "problem" | "other";
const KINDS: { value: Kind; label: string; heading: string; hint: string }[] = [
  {
    value: "idea",
    label: "Idea",
    heading: "Suggest something",
    hint: "What would make StudentOS better for you?",
  },
  {
    value: "problem",
    label: "Problem",
    heading: "Report a problem",
    hint: "What did you tap, and what happened instead? Name the page if you can.",
  },
  {
    value: "other",
    label: "Other",
    heading: "Tell us anything",
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

/** The textarea grows with the note (up to a limit) instead of showing a big empty box. */
function fit(element: HTMLTextAreaElement | null) {
  if (!element) return;
  element.style.height = "auto";
  element.style.height = `${Math.min(element.scrollHeight, 320)}px`;
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
  const area = React.useRef<HTMLTextAreaElement>(null);
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
      fit(area.current);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  function change(nextKind: Kind, nextMessage: string) {
    setKind(nextKind);
    setMessage(nextMessage);
    saveDraft(nextKind, nextMessage);
  }

  const length = message.trim().length;
  const current = KINDS.find((item) => item.value === kind)!;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    if (length < MIN) {
      setProblem("Please write a few words so we can act on it.");
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
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4 px-4 pt-2 pb-2 md:px-8 md:py-8">
      <PageHeader title="Send feedback" back={{ href: `/c/${slug}/me`, label: "You" }} />
      {sent ? (
        <div className="glass-card flex flex-col items-center gap-3 rounded-[22px] px-6 py-12 text-center">
          <span className="inline-flex size-12 animate-in zoom-in-50 fade-in-0 items-center justify-center rounded-full bg-[#2fb98a]/15 text-[#5fd6ad] duration-500">
            <CheckIcon aria-hidden="true" className="size-6" />
          </span>
          <p className="text-[17px] font-bold">Thank you. We have it.</p>
          <p className="max-w-[36ch] text-[14px] leading-relaxed text-ink-muted">
            Every note is read by the team. If it needs a reply, we will reach out.
          </p>
          <div className="mt-2 flex flex-wrap justify-center gap-2">
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
              <Link href={`/c/${slug}/me`}>Done</Link>
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="flex flex-col gap-3">
          <section className="glass-card overflow-hidden rounded-[22px]">
            <div className="flex flex-col gap-3 border-b border-white/[0.07] p-4">
              <GlideTabs
                label="Kind of feedback"
                value={kind}
                onChange={(next) => change(next, message)}
                tabs={KINDS.map((item) => ({ value: item.value, label: item.label }))}
              />
              <p className="px-0.5 text-[13px] text-ink-muted">{current.heading}</p>
            </div>
            <div className="px-4 pt-3 pb-2">
              <label htmlFor="feedback-note" className="sr-only">
                Your note
              </label>
              <textarea
                id="feedback-note"
                ref={area}
                value={message}
                onChange={(event) => {
                  change(kind, event.target.value);
                  fit(event.target);
                }}
                maxLength={MAX}
                rows={4}
                placeholder={current.hint}
                aria-invalid={problem ? true : undefined}
                className="block max-h-80 min-h-[7rem] w-full resize-none bg-transparent text-[16px] leading-relaxed outline-none placeholder:text-ink-muted/60 md:text-[14.5px]"
              />
              {from ? (
                <p className="mt-2 flex items-center gap-2 text-[12px] text-ink-muted">
                  <span className="min-w-0 truncate">
                    Page: <span className="text-ink/80">{from}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setFrom(undefined)}
                    aria-label="Leave the page out"
                    className="inline-flex size-5 shrink-0 items-center justify-center rounded-full hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <XIcon aria-hidden="true" className="size-3" />
                  </button>
                </p>
              ) : null}
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-white/[0.07] px-4 py-3">
              <span
                className={cn(
                  "min-w-0 truncate text-[12px]",
                  problem ? "font-medium text-danger" : "text-ink-muted",
                )}
              >
                {problem ?? (restored && length > 0 ? "Draft restored" : "Only the team sees this")}
                {problem ? null : (
                  <span className={cn("tabular", message.length > MAX - 100 && "text-[#f0a58c]")}>
                    {" · "}
                    {message.length}/{MAX}
                  </span>
                )}
              </span>
              <Button type="submit" disabled={busy || length < MIN} className="shrink-0">
                {busy ? <Spinner /> : <SendIcon aria-hidden="true" />} Send
              </Button>
            </div>
          </section>
          {error ? (
            <Banner variant="error">
              <p>{error}</p>
            </Banner>
          ) : null}
        </form>
      )}
    </div>
  );
}
