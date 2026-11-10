"use client";

import * as React from "react";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Textarea } from "@/components/ui/textarea";
import { LoadError } from "@/components/app/load-error";
import { Spinner } from "@/components/app/spinner";
import { ApiError, friendlyMessage } from "@/lib/api-client";
import { api, type Report } from "@/lib/api/endpoints";
import { useAttempt } from "@/lib/use-attempt";
import { usePaged } from "@/lib/use-paged";
import { useCollege } from "@/features/college";
import { ConsolePage, EmptyNote, ListSkeleton } from "./admin-shell";
import { PagedFooter } from "./paged-footer";

const REASON: Record<string, string> = {
  spam: "Spam",
  harassment: "Harassment",
  inappropriate: "Inappropriate",
  impersonation: "Pretending to be someone",
  scam: "Scam",
  other: "Something else",
};
const TARGET: Record<string, string> = {
  profile: "a profile",
  project: "a project",
  team_post: "a team post",
  announcement: "an announcement",
};

type Action = "dismiss" | "hide" | "warn" | "suspend";
const ACTION_WORDS: Record<Action, string> = {
  dismiss: "Dismiss (nothing wrong)",
  hide: "Hide the content",
  warn: "Warn the person",
  suspend: "Suspend the person",
};

function ReportCard({ item, onDone }: { item: Report; onDone: () => void }) {
  const { slug } = useCollege();
  const attempt = useAttempt();
  const [action, setAction] = React.useState<Action | null>(null);
  const [note, setNote] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const open = item.status === "open";

  async function submit() {
    if (!action || busy) return;
    if (action !== "dismiss" && note.trim().length < 5) {
      setError("Write a note of at least 5 characters. It is kept in the audit log.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.admin.actOnReport(
        slug,
        item.id,
        action === "dismiss" ? { action } : { action, note: note.trim() },
        attempt.get(),
      );
      attempt.reset();
      onDone();
    } catch (caught) {
      setError(
        caught instanceof ApiError && caught.code === "CONFLICT"
          ? "Someone already handled this report. Reload to see the latest."
          : friendlyMessage(caught, "We could not save that. Please try again."),
      );
      setBusy(false);
    }
  }

  return (
    <li className="flex flex-col gap-2.5 py-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4">
        <p className="text-[17px] font-semibold">
          {REASON[item.reason] ?? item.reason}: {TARGET[item.target_type] ?? item.target_type}
          {item.target_title ? (
            <span className="font-normal text-ink-muted"> · {item.target_title}</span>
          ) : null}
        </p>
        <span className="text-[14px] font-semibold text-ink-muted">
          {open ? "Open" : item.status === "dismissed" ? "Dismissed" : "Actioned"}
        </span>
      </div>
      <p className="text-[14px] text-ink-muted">
        Reported by {item.reporter.display_name} on{" "}
        {new Date(item.created_at).toLocaleDateString(undefined, {
          day: "numeric",
          month: "short",
          year: "numeric",
        })}
      </p>
      {item.details ? (
        <p className="max-w-prose text-[16px] leading-relaxed">{item.details}</p>
      ) : null}
      {error ? (
        <Banner variant="error">
          <p>{error}</p>
        </Banner>
      ) : null}
      {open ? (
        action ? (
          <div className="flex max-w-prose flex-col gap-3">
            <p className="text-[15px] font-medium">{ACTION_WORDS[action]}</p>
            {action !== "dismiss" ? (
              <FormField label="Note" help="At least 5 characters. Kept in the audit log." required>
                <Textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={500}
                  rows={3}
                />
              </FormField>
            ) : null}
            <div className="flex flex-wrap gap-3">
              <Button
                variant={action === "dismiss" ? "default" : "destructive"}
                onClick={() => void submit()}
                disabled={busy}
              >
                {busy ? <Spinner /> : null} Confirm
              </Button>
              <Button variant="ghost" onClick={() => setAction(null)} disabled={busy}>
                Back
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {(Object.keys(ACTION_WORDS) as Action[]).map((a) => (
              <Button key={a} variant="outline" size="sm" onClick={() => setAction(a)}>
                {ACTION_WORDS[a]}
              </Button>
            ))}
          </div>
        )
      ) : null}
    </li>
  );
}

/** What members reported. The author of the report is only shown to moderators and admins. */
export function ReportsScreen() {
  const { slug } = useCollege();
  const [openOnly, setOpenOnly] = React.useState(true);
  const list = usePaged(
    (cursor) => api.admin.reports(slug, openOnly ? "open" : undefined, cursor),
    [slug, openOnly],
  );
  return (
    <ConsolePage
      title="Reports"
      description="Members can report a profile, a team post or an announcement. Decide what to do."
    >
      <label className="flex min-h-11 w-fit items-center gap-3 text-[15px]">
        <input
          type="checkbox"
          className="size-5 accent-[var(--primary)]"
          checked={!openOnly}
          onChange={(e) => setOpenOnly(!e.target.checked)}
        />
        Also show handled reports
      </label>
      {list.state.status === "loading" ? (
        <ListSkeleton />
      ) : list.state.status === "error" ? (
        <LoadError error={list.state.error} onRetry={list.state.reload} what="the reports" />
      ) : list.items.length === 0 ? (
        <EmptyNote>
          {openOnly ? "No open reports. That is good news." : "No reports yet."}
        </EmptyNote>
      ) : (
        <>
          <ul className="divide-y divide-border border-y border-border">
            {list.items.map((item) => (
              <ReportCard key={item.id} item={item} onDone={list.state.reload} />
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
