"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { SendIcon } from "lucide-react";
import { cn } from "cn";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/app/page-header";
import { Spinner } from "@/components/app/spinner";
import { ApiError, friendlyMessage } from "@/lib/api-client";
import { api, type IdeaTopic } from "@/lib/api/endpoints";
import { useAttempt } from "@/lib/use-attempt";
import { useCollege } from "@/features/college";
import { SpacePicker } from "@/features/college/space-picker";
import { TOPICS, TOPIC_LABEL } from "./idea-card";

const TITLE_MAX = 140;
const BODY_MAX = 2000;

/**
 * The page for a new thought. It works like a message to a friend: type, send. The title and the topic are optional,
 * and one tap chooses who can see it (your college or Global).
 */
export function IdeaNewScreen() {
  const { slug } = useCollege();
  const router = useRouter();
  const attempt = useAttempt();
  const [space, setSpace] = React.useState(slug);
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  const [topic, setTopic] = React.useState<IdeaTopic>("other");
  const [more, setMore] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const empty = !title.trim() && !body.trim();

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy || empty) return;
    setBusy(true);
    setError(null);
    try {
      const idea = await api.ideas.create(
        space,
        { title: title.trim(), body: body.trim(), topic },
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

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-5 pt-2 md:px-8 md:py-8">
      <PageHeader title="New buzz" back={{ href: `/c/${slug}/ideas`, label: "Buzz" }} />
      <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
        <div className="flex flex-col gap-2">
          <label htmlFor="thought-body" className="sr-only">
            Your buzz
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
            rows={6}
            autoFocus
            placeholder="What's on your mind?"
            className="min-h-36 w-full resize-y rounded-[18px] border border-white/10 bg-white/[0.045] p-4 text-[16px] leading-relaxed outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-ink-muted/70 hover:border-white/25 focus-visible:border-[#7d74e0] focus-visible:ring-4 focus-visible:ring-[#7d74e0]/20"
          />
          {body.length > BODY_MAX - 200 ? (
            <p className="tabular self-end text-[12.5px] text-ink-muted" aria-live="polite">
              {body.length} / {BODY_MAX}
            </p>
          ) : null}
        </div>

        <SpacePicker value={space} onChange={setSpace} />

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
                      "inline-flex h-9 items-center rounded-full border px-4 text-[13px] font-semibold outline-none transition-[background-color,border-color,color,transform] duration-200 focus-visible:ring-2 focus-visible:ring-ring active:scale-95",
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
          <Button type="submit" size="lg" disabled={busy || empty}>
            {busy ? (
              <>
                <Spinner /> Posting
              </>
            ) : (
              <>
                <SendIcon aria-hidden="true" /> Post
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
