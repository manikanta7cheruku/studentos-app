"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { PlusIcon, SendIcon, XIcon } from "lucide-react";
import { cn } from "cn";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/app/page-header";
import { Spinner } from "@/components/app/spinner";
import { ToggleRow } from "@/components/app/toggle-row";
import { ApiError, friendlyMessage } from "@/lib/api-client";
import { api, type IdeaTopic } from "@/lib/api/endpoints";
import { useAttempt } from "@/lib/use-attempt";
import { useCollege } from "@/features/college";
import { SpacePicker } from "@/features/college/space-picker";
import { TOPICS, TOPIC_LABEL } from "./idea-card";

const TITLE_MAX = 140;
const BODY_MAX = 2000;

// Something to start from, so nobody faces an empty box. One tap fills it in.
const STARTERS = [
  "What is the one thing you wish you knew in your first week?",
  "Which subject is everyone struggling with right now?",
  "Anyone up for a weekend plan?",
  "Hot take about college life:",
];

type Mode = "post" | "poll";

/**
 * The page for a new buzz. It works like a message to a friend: type, send. It can be a plain post or a poll, it can answer the
 * question of the day, and it can go out without your name. One tap chooses who can see it (your college or Global).
 */
export function IdeaNewScreen() {
  const { slug } = useCollege();
  const router = useRouter();
  const attempt = useAttempt();
  const [space, setSpace] = React.useState(slug);
  const [mode, setMode] = React.useState<Mode>("post");
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  const [options, setOptions] = React.useState(["", ""]);
  const [anonymous, setAnonymous] = React.useState(false);
  const [topic, setTopic] = React.useState<IdeaTopic>("other");
  const [more, setMore] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const filled = options.map((option) => option.trim()).filter(Boolean);
  const pollOk = mode !== "poll" || (filled.length >= 2 && body.trim().length > 0);
  const empty = !title.trim() && !body.trim();
  const blocked = empty || !pollOk;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy || blocked) return;
    setBusy(true);
    setError(null);
    try {
      const idea = await api.ideas.create(
        space,
        {
          title: title.trim(),
          body: body.trim(),
          topic,
          anonymous,
          ...(mode === "poll" ? { poll: filled } : {}),
        },
        attempt.get(),
      );
      attempt.reset();
      router.push(`/c/${space}/ideas/${idea.id}`);
    } catch (caught) {
      if (!(caught instanceof ApiError && caught.isOffline)) attempt.reset();
      setError(friendlyMessage(caught, "We could not post your buzz. Please try again."));
      setBusy(false);
    }
  }

  const chip =
    "inline-flex h-9 items-center rounded-full border px-4 text-[13px] font-semibold outline-none transition-[background-color,border-color,color,transform] duration-200 focus-visible:ring-2 focus-visible:ring-ring active:scale-95";

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-5 pt-4 pb-2 md:px-8 md:py-8">
      <PageHeader title="New buzz" back={{ href: `/c/${slug}/ideas`, label: "Buzz" }} />
      <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
        <div role="group" aria-label="Kind of buzz" className="flex gap-2">
          {(
            [
              ["post", "Post"],
              ["poll", "Poll"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={mode === value}
              onClick={() => setMode(value)}
              className={cn(
                chip,
                mode === value
                  ? "bg-brand border-transparent text-white"
                  : "border-white/10 bg-white/[0.04] text-ink-muted hover:border-white/25 hover:text-ink",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="thought-body" className="sr-only">
            {mode === "poll" ? "Your question" : "Your buzz"}
          </label>
          <textarea
            id="thought-body"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                event.preventDefault();
                void submit(event as unknown as React.FormEvent);
              }
            }}
            maxLength={BODY_MAX}
            rows={mode === "poll" ? 3 : 6}
            autoFocus
            placeholder={mode === "poll" ? "Ask your question" : "What's on your mind?"}
            className="min-h-28 w-full resize-y rounded-[18px] border border-white/10 bg-white/[0.045] p-4 text-[16px] leading-relaxed outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-ink-muted/70 hover:border-white/25 focus-visible:border-[#8f86f0]/70 focus-visible:shadow-[0_0_0_3px_rgba(143,134,240,0.22)]"
          />
          {body.length > BODY_MAX - 200 ? (
            <p className="tabular self-end text-[12.5px] text-ink-muted" aria-live="polite">
              {body.length} / {BODY_MAX}
            </p>
          ) : null}
          {!body && mode === "post" ? (
            <div className="flex flex-wrap gap-2" aria-label="Ideas to start from">
              {STARTERS.map((starter) => (
                <button
                  key={starter}
                  type="button"
                  onClick={() => setBody(starter + (starter.endsWith(":") ? " " : ""))}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-left text-[12.5px] text-ink-muted outline-none transition-[border-color,color] hover:border-white/25 hover:text-ink focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {starter}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {mode === "poll" ? (
          <div className="flex flex-col gap-2.5">
            <p className="text-[13px] font-semibold text-ink/90">Options (2 to 4)</p>
            {options.map((option, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  aria-label={`Option ${index + 1}`}
                  value={option}
                  onChange={(event) =>
                    setOptions((current) =>
                      current.map((value, at) => (at === index ? event.target.value : value)),
                    )
                  }
                  maxLength={40}
                  placeholder={`Option ${index + 1}`}
                />
                {options.length > 2 ? (
                  <button
                    type="button"
                    aria-label={`Remove option ${index + 1}`}
                    onClick={() => setOptions((current) => current.filter((_, at) => at !== index))}
                    className="inline-flex size-11 shrink-0 items-center justify-center rounded-[12px] text-ink-muted outline-none hover:bg-white/10 hover:text-ink focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <XIcon aria-hidden="true" className="size-4" />
                  </button>
                ) : null}
              </div>
            ))}
            {options.length < 4 ? (
              <button
                type="button"
                onClick={() => setOptions((current) => [...current, ""])}
                className="inline-flex h-10 w-fit items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold text-[#b9b4ee] outline-none hover:bg-white/[0.06] focus-visible:ring-2 focus-visible:ring-ring"
              >
                <PlusIcon aria-hidden="true" className="size-4" /> Add an option
              </button>
            ) : null}
          </div>
        ) : null}

        <SpacePicker value={space} onChange={setSpace} />

        <ToggleRow
          checked={anonymous}
          onChange={setAnonymous}
          title="Post anonymously"
          text="Others see “Anonymous” and an animal name. If someone reports it, moderators can still see who posted. Keep it respectful, no adult content."
        />

        <div className="flex flex-col gap-3">
          <button
            type="button"
            aria-expanded={more}
            onClick={() => setMore((value) => !value)}
            className="w-fit text-[13.5px] font-semibold text-ink-muted underline-offset-4 hover:text-ink hover:underline"
          >
            {more ? "Hide title and topic" : "Add a title or a topic (optional)"}
          </button>
          {more ? (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="thought-title" className="sr-only">
                  Title
                </label>
                <input
                  id="thought-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  maxLength={TITLE_MAX}
                  placeholder="A title, if you like"
                  className="w-full bg-transparent font-heading text-[1.3rem] font-extrabold leading-tight tracking-tight outline-none placeholder:text-ink-muted/50"
                />
              </div>
              <fieldset className="flex flex-wrap gap-2">
                <legend className="sr-only">Topic</legend>
                {TOPICS.map((value) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={topic === value}
                    onClick={() => setTopic(value)}
                    className={cn(
                      chip,
                      topic === value
                        ? "bg-brand border-transparent text-white"
                        : "border-white/10 bg-white/[0.04] text-ink-muted hover:border-white/25 hover:text-ink",
                    )}
                  >
                    {TOPIC_LABEL[value]}
                  </button>
                ))}
              </fieldset>
            </div>
          ) : null}
        </div>

        {error ? (
          <Banner variant="error">
            <p>{error}</p>
          </Banner>
        ) : null}

        <div className="flex items-center gap-3">
          <Button type="submit" size="lg" disabled={busy || blocked}>
            {busy ? (
              <>
                <Spinner /> Posting
              </>
            ) : (
              <>
                <SendIcon aria-hidden="true" /> {mode === "poll" ? "Post poll" : "Post"}
              </>
            )}
          </Button>
          <Button type="button" variant="ghost" size="lg" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
