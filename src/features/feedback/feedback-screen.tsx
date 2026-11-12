"use client";

import * as React from "react";
import { CheckCircle2Icon } from "lucide-react";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { ChoiceChips } from "@/components/ui/choice-chips";
import { FormField } from "@/components/ui/form-field";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/app/page-header";
import { Spinner } from "@/components/app/spinner";
import { ApiError, friendlyMessage } from "@/lib/api-client";
import { api } from "@/lib/api/endpoints";
import { useCollege } from "@/features/college";

type Kind = "idea" | "problem" | "other";
const KINDS: { value: Kind; label: string }[] = [
  { value: "idea", label: "An idea" },
  { value: "problem", label: "Something is wrong" },
  { value: "other", label: "Something else" },
];

/** A short note to the team. It goes to the owner dashboard; nobody else sees it. */
export function FeedbackScreen() {
  const { slug } = useCollege();
  const [kind, setKind] = React.useState<Kind>("idea");
  const [message, setMessage] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [problem, setProblem] = React.useState<string | undefined>();
  const [sent, setSent] = React.useState(false);
  // The screen the person came from, so we know what they were talking about.
  const [from] = React.useState(() => {
    try {
      return document.referrer ? new URL(document.referrer).pathname.slice(0, 200) : undefined;
    } catch {
      return undefined;
    }
  });

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    if (message.trim().length < 5) {
      setProblem("Write at least a few words.");
      return;
    }
    setProblem(undefined);
    setBusy(true);
    setError(null);
    try {
      await api.feedback.send({ kind, message: message.trim(), ...(from ? { page: from } : {}) });
      setSent(true);
    } catch (caught) {
      setError(
        caught instanceof ApiError && caught.code === "RATE_LIMITED"
          ? "You sent a lot today. Please try again tomorrow."
          : friendlyMessage(caught, "We could not send that. Please try again."),
      );
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-5 pt-4 pb-2 md:px-8 md:py-8">
      <PageHeader
        title="Send feedback"
        description="Tell us what to build, what broke, or what feels off. We read every note."
        back={{ href: `/c/${slug}/me`, label: "You" }}
      />
      {sent ? (
        <div className="glass-card flex flex-col items-center gap-3 rounded-[24px] px-6 py-12 text-center">
          <CheckCircle2Icon aria-hidden="true" className="size-10 text-success" />
          <p className="text-lg font-bold">Thank you</p>
          <p className="max-w-[32ch] text-[14px] text-ink-muted">
            Your note reached the team. If it is a bug, a screenshot of the screen helps next time.
          </p>
          <Button
            variant="outline"
            onClick={() => {
              setSent(false);
              setMessage("");
              setBusy(false);
            }}
          >
            Send another
          </Button>
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <p className="text-[13px] font-semibold text-ink/90">What is it?</p>
            <ChoiceChips label="Kind of feedback" value={kind} onChange={setKind} options={KINDS} />
          </div>
          <FormField label="Your note" error={problem} required>
            <Textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              maxLength={1500}
              rows={6}
              placeholder="What would make StudentOS better for you?"
            />
          </FormField>
          {error ? (
            <Banner variant="error">
              <p>{error}</p>
            </Banner>
          ) : null}
          <Button type="submit" size="lg" disabled={busy}>
            {busy ? <Spinner /> : null} Send
          </Button>
        </form>
      )}
    </div>
  );
}
