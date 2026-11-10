"use client";

import * as React from "react";
import Link from "next/link";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadError } from "@/components/app/load-error";
import { Spinner } from "@/components/app/spinner";
import { ApiError, friendlyMessage } from "@/lib/api-client";
import { api, type JoinRequestItem, type TeamPostDetail } from "@/lib/api/endpoints";
import { useAttempt } from "@/lib/use-attempt";
import { useLoad } from "@/lib/use-load";
import { useCollege } from "@/features/college";

const STATUS_WORDS: Record<string, string> = {
  pending: "Waiting",
  accepted: "Accepted",
  declined: "Declined",
  withdrawn: "Withdrawn",
  cancelled: "Cancelled",
};

/** One request, with the buttons that decide it. */
function RequestCard({ item, onDecided }: { item: JoinRequestItem; onDecided: () => void }) {
  const { slug } = useCollege();
  const attempt = useAttempt();
  const [declining, setDeclining] = React.useState(false);
  const [note, setNote] = React.useState("");
  const [busy, setBusy] = React.useState<"accepted" | "declined" | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function decide(decision: "accepted" | "declined") {
    if (busy) return;
    setBusy(decision);
    setError(null);
    try {
      await api.teamPosts.decide(slug, item.id, decision, note.trim() || undefined, attempt.get());
      attempt.reset();
      onDecided();
    } catch (caught) {
      if (!(caught instanceof ApiError && caught.isOffline)) attempt.reset();
      setError(
        caught instanceof ApiError && caught.code === "SLOTS_FULL"
          ? "That role is already full."
          : caught instanceof ApiError && caught.code === "CONFLICT"
            ? "This request was already decided or withdrawn. Reload to see the latest."
            : friendlyMessage(caught, "We could not save your answer. Please try again."),
      );
      setBusy(null);
    }
  }

  const pending = item.status === "pending";
  return (
    <li className="flex flex-col gap-3 py-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="text-[15px] font-semibold">
          <Link
            href={`/c/${slug}/people/${item.applicant.user_id}`}
            className="underline-offset-4 hover:underline"
          >
            {item.applicant.display_name}
          </Link>{" "}
          <span className="font-normal text-ink-muted">wants to be {item.role_name}</span>
        </p>
        <span className="text-[13px] font-semibold text-ink-muted">
          {STATUS_WORDS[item.status] ?? item.status}
        </span>
      </div>
      {item.applicant.headline ? (
        <p className="text-[13.5px] text-ink-muted">{item.applicant.headline}</p>
      ) : null}
      {item.applicant.skills.length ? (
        <p className="text-[13.5px] text-ink-muted">Skills: {item.applicant.skills.join(", ")}</p>
      ) : null}
      {item.message ? (
        <blockquote className="max-w-prose border-l-2 border-border-strong pl-4 text-[14px] leading-relaxed text-ink">
          {item.message}
        </blockquote>
      ) : null}
      {item.decision_note ? (
        <p className="text-[13.5px] text-ink-muted">Your note: {item.decision_note}</p>
      ) : null}
      {error ? (
        <Banner variant="error">
          <p>{error}</p>
        </Banner>
      ) : null}
      {pending ? (
        declining ? (
          <div className="flex max-w-prose flex-col gap-3">
            <FormField label="A note for them" help="Optional. They will see it.">
              <Textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                maxLength={500}
                rows={3}
              />
            </FormField>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="destructive"
                onClick={() => void decide("declined")}
                disabled={busy !== null}
              >
                {busy === "declined" ? <Spinner /> : null} Decline
              </Button>
              <Button variant="ghost" onClick={() => setDeclining(false)} disabled={busy !== null}>
                Back
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => void decide("accepted")} disabled={busy !== null}>
              {busy === "accepted" ? <Spinner /> : null} Accept
            </Button>
            <Button variant="outline" onClick={() => setDeclining(true)} disabled={busy !== null}>
              Decline
            </Button>
          </div>
        )
      ) : null}
    </li>
  );
}

/** For the author of a post: who asked to join, and the answer to each. */
export function PostRequests({ post, onChanged }: { post: TeamPostDetail; onChanged: () => void }) {
  const { slug } = useCollege();
  const state = useLoad(() => api.teamPosts.requests(slug, post.id), [slug, post.id]);

  return (
    <section aria-labelledby="requests" className="flex flex-col gap-3">
      <h2
        id="requests"
        className="text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-muted"
      >
        Requests{" "}
        {post.pending_requests ? (
          <span className="tabular">({post.pending_requests} waiting)</span>
        ) : null}
      </h2>
      {state.status === "loading" ? (
        <div aria-busy="true" className="flex flex-col gap-3">
          <Skeleton className="h-20 w-full" />
        </div>
      ) : state.status === "error" ? (
        <LoadError error={state.error} onRetry={state.reload} what="the requests" />
      ) : state.data.length === 0 ? (
        <p className="rounded-card border border-dashed border-border-strong p-5 text-[14px] text-ink-muted">
          Nobody has asked yet. Share the post with your classmates.
        </p>
      ) : (
        <ul className="divide-y divide-border border-y border-border">
          {[...state.data]
            .sort((a, b) => Number(b.status === "pending") - Number(a.status === "pending"))
            .map((item) => (
              <RequestCard
                key={item.id}
                item={item}
                onDecided={() => {
                  state.reload();
                  onChanged();
                }}
              />
            ))}
        </ul>
      )}
    </section>
  );
}
