"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { GlobeIcon } from "lucide-react";
import { cn } from "cn";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/app/page-header";
import { Spinner } from "@/components/app/spinner";
import { ApiError, friendlyMessage } from "@/lib/api-client";
import { api, type IdeaTopic } from "@/lib/api/endpoints";
import { GLOBAL_SLUG } from "@/lib/home-path";
import { useAttempt } from "@/lib/use-attempt";
import { useCollege } from "@/features/college";
import { TOPICS, TOPIC_LABEL } from "./idea-card";

const TITLE_MAX = 140;
const BODY_MAX = 2000;

/** The page for a new idea: a big title, some words, a topic, one button. It posts to the space you are in. */
export function IdeaNewScreen() {
  const { slug, college } = useCollege();
  const router = useRouter();
  const attempt = useAttempt();
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  const [topic, setTopic] = React.useState<IdeaTopic>("other");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [problem, setProblem] = React.useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    if (title.trim().length < 5) {
      setProblem("Give it a title of at least 5 characters.");
      return;
    }
    setProblem(null);
    setBusy(true);
    setError(null);
    try {
      const idea = await api.ideas.create(
        slug,
        { title: title.trim(), body: body.trim(), topic },
        attempt.get(),
      );
      attempt.reset();
      router.push(`/c/${slug}/ideas/${idea.id}`);
    } catch (caught) {
      if (!(caught instanceof ApiError && caught.isOffline)) attempt.reset();
      setError(friendlyMessage(caught, "We could not post your idea. Please try again."));
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-5 py-6 md:px-8 md:py-10">
      <PageHeader title="New idea" back={{ href: `/c/${slug}/ideas`, label: "Ideas" }} />
      <form onSubmit={submit} className="flex flex-col gap-6" noValidate>
        <p className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-[13px] font-semibold">
          <span className="bg-brand inline-flex size-5 items-center justify-center rounded-full text-white">
            <GlobeIcon aria-hidden="true" className="size-3" />
          </span>
          Posting to {slug === GLOBAL_SLUG ? "Global" : college.name}
        </p>

        <div className="flex flex-col gap-2">
          <label htmlFor="idea-title" className="sr-only">
            Title
          </label>
          <input
            id="idea-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={TITLE_MAX}
            placeholder="Give it a title"
            autoFocus
            aria-invalid={problem ? true : undefined}
            aria-describedby={problem ? "idea-title-problem" : undefined}
            className="w-full bg-transparent font-heading text-[1.6rem] font-extrabold leading-tight tracking-tight outline-none placeholder:text-ink-muted/50"
          />
          {problem ? (
            <p id="idea-title-problem" className="text-[13px] text-danger">
              {problem}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="idea-body" className="sr-only">
            Your idea
          </label>
          <textarea
            id="idea-body"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            maxLength={BODY_MAX}
            rows={7}
            placeholder="Say it simply. What would you build or change, and why would people want it?"
            className="min-h-40 w-full resize-y rounded-[14px] border border-white/10 bg-white/[0.045] p-4 text-[15px] leading-relaxed outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-ink-muted/70 hover:border-white/25 focus-visible:border-[#7d74e0] focus-visible:ring-4 focus-visible:ring-[#7d74e0]/20"
          />
          <p className="tabular self-end text-[12.5px] text-ink-muted" aria-live="polite">
            {body.length} / {BODY_MAX}
          </p>
        </div>

        <fieldset className="flex flex-col gap-3">
          <legend className="text-[13px] font-semibold text-ink-muted">Topic</legend>
          <div className="flex flex-wrap gap-2">
            {TOPICS.map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={topic === value}
                onClick={() => setTopic(value)}
                className={cn(
                  "inline-flex h-9 items-center rounded-full border px-4 text-[13px] font-semibold outline-none transition-[background-color,border-color,color,transform] duration-200 focus-visible:ring-2 focus-visible:ring-ring active:scale-95",
                  topic === value
                    ? "bg-brand border-transparent text-white"
                    : "border-white/10 bg-white/[0.04] text-ink-muted hover:border-white/25 hover:text-ink",
                )}
              >
                {TOPIC_LABEL[value]}
              </button>
            ))}
          </div>
        </fieldset>

        {error ? (
          <Banner variant="error">
            <p>{error}</p>
          </Banner>
        ) : null}

        <div className="flex items-center gap-3">
          <Button type="submit" size="lg" disabled={busy}>
            {busy ? (
              <>
                <Spinner /> Posting
              </>
            ) : (
              "Post idea"
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
