"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ScaleIcon } from "lucide-react";
import { cn } from "cn";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/app/page-header";
import { Spinner } from "@/components/app/spinner";
import { ApiError, friendlyMessage } from "@/lib/api-client";
import { api, type DebateTopic } from "@/lib/api/endpoints";
import { useAttempt } from "@/lib/use-attempt";
import { useCollege } from "@/features/college";
import { SpacePicker } from "@/features/college/space-picker";
import { DEBATE_TOPICS, DEBATE_TOPIC_LABEL } from "./debate-parts";

const HOURS = [
  { value: 1, label: "1 hour" },
  { value: 6, label: "6 hours" },
  { value: 24, label: "1 day" },
  { value: 72, label: "3 days" },
  { value: 168, label: "1 week" },
] as const;

// Pairs of sides to start from. One tap fills both boxes.
const SIDE_PAIRS = [
  ["Agree", "Disagree"],
  ["Yes", "No"],
  ["For", "Against"],
  ["Team A", "Team B"],
] as const;

const chip =
  "inline-flex h-9 items-center rounded-full border px-4 text-[13px] font-semibold outline-none transition-[background-color,border-color,color,transform] duration-200 focus-visible:ring-2 focus-visible:ring-ring active:scale-95";
const on = "bg-brand border-transparent text-white";
const off = "border-white/10 bg-white/[0.04] text-ink-muted hover:border-white/25 hover:text-ink";

/** Start a debate: the question, two sides, a topic and how long it runs. It closes by itself. */
export function DebateNewScreen() {
  const { slug } = useCollege();
  const router = useRouter();
  const attempt = useAttempt();
  const [space, setSpace] = React.useState(slug);
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  const [topic, setTopic] = React.useState<DebateTopic>("other");
  const [sideA, setSideA] = React.useState("Agree");
  const [sideB, setSideB] = React.useState("Disagree");
  const [hours, setHours] = React.useState<number>(24);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [fields, setFields] = React.useState<Record<string, string>>({});

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    const problems: Record<string, string> = {};
    if (title.trim().length < 5)
      problems.title = "Write the question or claim (at least 5 characters).";
    if (!sideA.trim() || !sideB.trim()) problems.sides = "Name both sides.";
    else if (sideA.trim().toLowerCase() === sideB.trim().toLowerCase())
      problems.sides = "The two sides must be different.";
    setFields(problems);
    if (Object.keys(problems).length) return;
    setBusy(true);
    setError(null);
    try {
      const debate = await api.debates.create(
        space,
        {
          title: title.trim(),
          body: body.trim(),
          topic,
          side_a: sideA.trim(),
          side_b: sideB.trim(),
          hours: hours as 1 | 6 | 24 | 72 | 168,
        },
        attempt.get(),
      );
      attempt.reset();
      router.push(`/c/${space}/debates/${debate.id}`);
    } catch (caught) {
      if (!(caught instanceof ApiError && caught.isOffline)) attempt.reset();
      setError(
        caught instanceof ApiError && caught.code === "RATE_LIMITED"
          ? "You have started 3 debates today. Try again tomorrow."
          : friendlyMessage(caught, "We could not start the debate. Please try again."),
      );
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 pt-2 pb-2 md:px-8 md:py-8">
      <PageHeader title="Start a debate" back={{ href: `/c/${slug}/debates`, label: "Debates" }} />
      <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
        <FormField label="The question or claim" error={fields.title} required>
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={140}
            placeholder="Is the book always better than the movie?"
            autoFocus
          />
        </FormField>
        <FormField label="A little context" help="Optional. Set the scene in a few lines.">
          <Textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            maxLength={600}
            rows={3}
          />
        </FormField>

        <fieldset className="flex flex-col gap-2.5">
          <legend className="mb-1 text-[13px] font-semibold text-ink/90">Topic</legend>
          <div className="flex flex-wrap gap-2">
            {DEBATE_TOPICS.map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={topic === value}
                onClick={() => setTopic(value)}
                className={cn(chip, topic === value ? on : off)}
              >
                {DEBATE_TOPIC_LABEL[value]}
              </button>
            ))}
          </div>
          {topic === "politics" ? (
            <p className="text-[12.5px] leading-snug text-ink-muted">
              Politics gets heated. Argue the idea, not the person. Hate, threats and abuse are
              removed, and anyone can report.
            </p>
          ) : null}
        </fieldset>

        <div className="flex flex-col gap-2.5">
          <p className="text-[13px] font-semibold text-ink/90">The two sides</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="side-a" className="text-[12px] text-ink-muted">
                Side A
              </label>
              <Input
                id="side-a"
                value={sideA}
                onChange={(event) => setSideA(event.target.value)}
                maxLength={30}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="side-b" className="text-[12px] text-ink-muted">
                Side B
              </label>
              <Input
                id="side-b"
                value={sideB}
                onChange={(event) => setSideB(event.target.value)}
                maxLength={30}
              />
            </div>
          </div>
          <div role="group" aria-label="Pairs to start from" className="flex flex-wrap gap-2">
            {SIDE_PAIRS.map(([a, b]) => (
              <button
                key={a}
                type="button"
                onClick={() => {
                  setSideA(a);
                  setSideB(b);
                }}
                className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[12.5px] text-ink-muted outline-none transition-[border-color,color] hover:border-white/25 hover:text-ink focus-visible:ring-2 focus-visible:ring-ring"
              >
                {a} / {b}
              </button>
            ))}
          </div>
          {fields.sides ? (
            <p className="text-[12.5px] font-medium text-danger">{fields.sides}</p>
          ) : null}
        </div>

        <fieldset className="flex flex-col gap-2.5">
          <legend className="mb-1 text-[13px] font-semibold text-ink/90">
            How long does it run?
          </legend>
          <div className="flex flex-wrap gap-2">
            {HOURS.map((item) => (
              <button
                key={item.value}
                type="button"
                aria-pressed={hours === item.value}
                onClick={() => setHours(item.value)}
                className={cn(chip, hours === item.value ? on : off)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <p className="text-[12.5px] text-ink-muted">
            It closes by itself, and the side with more people wins.
          </p>
        </fieldset>

        <SpacePicker value={space} onChange={setSpace} />

        {error ? (
          <Banner variant="error">
            <p>{error}</p>
          </Banner>
        ) : null}
        <div className="flex items-center gap-3">
          <Button type="submit" size="lg" disabled={busy}>
            {busy ? (
              <>
                <Spinner /> Starting
              </>
            ) : (
              <>
                <ScaleIcon aria-hidden="true" /> Start the debate
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
