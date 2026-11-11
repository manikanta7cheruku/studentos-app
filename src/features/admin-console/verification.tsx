"use client";

import * as React from "react";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Textarea } from "@/components/ui/textarea";
import { LoadError } from "@/components/app/load-error";
import { Spinner } from "@/components/app/spinner";
import { ApiError, friendlyMessage } from "@/lib/api-client";
import { api, type VerificationRequest } from "@/lib/api/endpoints";
import { useAttempt } from "@/lib/use-attempt";
import { usePaged } from "@/lib/use-paged";
import { useCollege } from "@/features/college";
import { ConsolePage, EmptyNote, ListSkeleton } from "./admin-shell";
import { PagedFooter } from "./paged-footer";

const METHOD_WORDS: Record<string, string> = {
  manual: "Asked to join (manual)",
  email_domain: "College email",
  invite_code: "Invite code",
  roster: "Roster",
  open: "Open",
};

function when(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function RequestCard({ item, onDone }: { item: VerificationRequest; onDone: () => void }) {
  const { slug } = useCollege();
  const attempt = useAttempt();
  const [mode, setMode] = React.useState<"idle" | "reject">("idle");
  const [reason, setReason] = React.useState("");
  const [busy, setBusy] = React.useState<"approved" | "rejected" | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function decide(decision: "approved" | "rejected") {
    if (busy) return;
    if (decision === "rejected" && reason.trim().length < 5) {
      setError("Write a reason of at least 5 characters. The person will read it.");
      return;
    }
    setBusy(decision);
    setError(null);
    try {
      await api.admin.decide(
        slug,
        item.id,
        decision === "approved" ? { decision } : { decision, reason: reason.trim() },
        attempt.get(),
      );
      attempt.reset();
      onDone();
    } catch (caught) {
      if (!(caught instanceof ApiError && caught.isOffline)) attempt.reset();
      setError(
        caught instanceof ApiError && caught.code === "CONFLICT"
          ? "Someone already decided this request. Reload to see the latest."
          : friendlyMessage(caught, "We could not save the decision. Please try again."),
      );
      setBusy(null);
    }
  }

  const pending = item.status === "pending";
  return (
    <li className="flex flex-col gap-3 py-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="text-[18px] font-semibold">{item.applicant.display_name}</p>
        <span className="text-[14px] font-semibold text-ink-muted">
          {pending ? "Waiting" : item.status}
        </span>
      </div>
      <p className="text-[15px] text-ink-muted">
        {item.applicant.email} · {METHOD_WORDS[item.method] ?? item.method} · sent{" "}
        {when(item.created_at)}
      </p>
      <dl className="grid max-w-xl grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-[16px]">
        <dt className="text-ink-muted">Course</dt>
        <dd>{item.submitted.program ?? "Not given"}</dd>
        <dt className="text-ink-muted">Finishes</dt>
        <dd>{item.submitted.grad_year ?? "Not given"}</dd>
        <dt className="text-ink-muted">Enrolment ends in</dt>
        <dd className="font-mono">{item.submitted.enrollment_last4 ?? "Not given"}</dd>
      </dl>
      {item.decision_reason ? (
        <p className="text-[15px] text-ink-muted">Reason given: {item.decision_reason}</p>
      ) : null}
      {error ? (
        <Banner variant="error">
          <p>{error}</p>
        </Banner>
      ) : null}
      {pending ? (
        mode === "reject" ? (
          <div className="flex max-w-prose flex-col gap-3">
            <FormField label="Reason" help="The person reads this. At least 5 characters." required>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={500}
                rows={3}
              />
            </FormField>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="destructive"
                onClick={() => void decide("rejected")}
                disabled={busy !== null}
              >
                {busy === "rejected" ? <Spinner /> : null} Reject
              </Button>
              <Button variant="ghost" onClick={() => setMode("idle")} disabled={busy !== null}>
                Back
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => void decide("approved")} disabled={busy !== null}>
              {busy === "approved" ? <Spinner /> : null} Approve
            </Button>
            <Button variant="outline" onClick={() => setMode("reject")} disabled={busy !== null}>
              Reject
            </Button>
          </div>
        )
      ) : null}
    </li>
  );
}

/** People who asked to join and are waiting for an admin. */
export function VerificationScreen() {
  const { slug } = useCollege();
  const [status, setStatus] = React.useState<"pending" | "all">("pending");
  const list = usePaged(
    (cursor) => api.admin.verification(slug, status === "pending" ? "pending" : undefined, cursor),
    [slug, status],
  );
  return (
    <ConsolePage
      title="Join requests"
      description="People who asked to join your college. Check their details, then approve or reject."
    >
      <label className="flex min-h-11 w-fit items-center gap-3 text-[15px]">
        <input
          type="checkbox"
          className="size-5 accent-[var(--primary)]"
          checked={status === "all"}
          onChange={(event) => setStatus(event.target.checked ? "all" : "pending")}
        />
        Also show decided requests
      </label>
      {list.state.status === "loading" ? (
        <ListSkeleton />
      ) : list.state.status === "error" ? (
        <LoadError error={list.state.error} onRetry={list.state.reload} what="the join requests" />
      ) : list.items.length === 0 ? (
        <EmptyNote>
          {status === "pending"
            ? "Nobody is waiting. When someone asks to join with a manual request, it shows up here."
            : "No requests yet."}
        </EmptyNote>
      ) : (
        <>
          <ul className="glass-card divide-y divide-white/[0.07] rounded-[22px] px-4">
            {list.items.map((item) => (
              <RequestCard key={item.id} item={item} onDone={list.state.reload} />
            ))}
          </ul>
          <PagedFooter
            hasMore={list.hasMore}
            loadingMore={list.loadingMore}
            moreError={list.moreError}
            onMore={list.more}
            count={list.items.length}
          />
        </>
      )}
    </ConsolePage>
  );
}
