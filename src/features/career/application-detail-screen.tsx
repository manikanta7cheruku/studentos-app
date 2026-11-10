"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarIcon, ExternalLinkIcon, PencilIcon } from "lucide-react";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadError } from "@/components/app/load-error";
import { Spinner } from "@/components/app/spinner";
import { ApiError, friendlyMessage } from "@/lib/api-client";
import { api, type ApplicationDetail, type ApplicationStatus } from "@/lib/api/endpoints";
import { useLoad } from "@/lib/use-load";
import { useCollege } from "@/features/college";
import { STATUSES, STATUS_LABEL, deadlineWords, formatDate, isOverdue } from "./format";
import { StatusPill } from "./tracker-screen";

function whenWords(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

function StatusChanger({
  app,
  onChanged,
  onConflict,
}: {
  app: ApplicationDetail;
  onChanged: () => void;
  onConflict: () => void;
}) {
  const [next, setNext] = React.useState<ApplicationStatus | null>(null);
  const [note, setNote] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function save() {
    if (!next || busy) return;
    setBusy(true);
    setError(null);
    try {
      await api.applications.status(app.id, next, note.trim(), app.version);
      setNext(null);
      setNote("");
      onChanged();
    } catch (caught) {
      if (caught instanceof ApiError && caught.code === "VERSION_CONFLICT") {
        onConflict();
      } else {
        setError(friendlyMessage(caught, "We could not change the status. Please try again."));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="move" className="flex flex-col gap-3">
      <h2
        id="move"
        className="text-[13px] font-semibold uppercase tracking-[0.08em] text-ink-muted"
      >
        Where is it now?
      </h2>
      <div role="group" aria-label="Move to" className="flex flex-wrap gap-2">
        {STATUSES.map((status) => {
          const current = status === app.status;
          const picked = next === status;
          return (
            <button
              key={status}
              type="button"
              aria-pressed={current || picked}
              disabled={current}
              onClick={() => setNext(picked ? null : status)}
              className={
                "inline-flex min-h-11 items-center rounded-full border px-4 text-[15px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background " +
                (current
                  ? "border-primary bg-primary text-primary-foreground"
                  : picked
                    ? "border-primary bg-primary/10 text-ink"
                    : "border-border bg-surface text-ink hover:border-border-strong")
              }
            >
              {STATUS_LABEL[status]}
              {current ? <span className="sr-only"> (now)</span> : null}
            </button>
          );
        })}
      </div>
      {next ? (
        <div className="flex max-w-prose flex-col gap-3">
          <FormField
            label={`Note for the move to ${STATUS_LABEL[next]}`}
            help="Optional. It goes in the history."
          >
            <Input value={note} onChange={(event) => setNote(event.target.value)} maxLength={500} />
          </FormField>
          {error ? (
            <Banner variant="error">
              <p>{error}</p>
            </Banner>
          ) : null}
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => void save()} disabled={busy}>
              {busy ? <Spinner /> : null} Move to {STATUS_LABEL[next]}
            </Button>
            <Button variant="ghost" onClick={() => setNext(null)} disabled={busy}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function DeleteDialog({
  app,
  open,
  onOpenChange,
}: {
  app: ApplicationDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { slug } = useCollege();
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      await api.applications.remove(app.id);
      router.replace(`/c/${slug}/career`);
    } catch (caught) {
      setError(friendlyMessage(caught, "We could not delete it. Please try again."));
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete this application?</DialogTitle>
          <DialogDescription>
            {app.company}, {app.role_title}. Its notes and history are deleted for good.
          </DialogDescription>
        </DialogHeader>
        {error ? (
          <Banner variant="error">
            <p>{error}</p>
          </Banner>
        ) : null}
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            Keep it
          </Button>
          <Button variant="destructive" onClick={() => void remove()} disabled={busy}>
            {busy ? <Spinner /> : null} Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Body({ app, reload }: { app: ApplicationDetail; reload: () => void }) {
  const { slug } = useCollege();
  const [conflict, setConflict] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const words = deadlineWords(app.deadline, app.status);
  const overdue = isOverdue(app);

  return (
    <article className="flex flex-col gap-8">
      {conflict ? (
        <Banner variant="warning" title="This changed somewhere else">
          <p>You or another device changed this application. Load the latest and try again.</p>
          <Button
            className="mt-3"
            variant="outline"
            onClick={() => {
              setConflict(false);
              reload();
            }}
          >
            Load the latest
          </Button>
        </Banner>
      ) : null}
      <header className="flex flex-col gap-3 border-b border-border pb-6">
        <div className="flex flex-wrap items-center gap-3">
          <StatusPill status={app.status} />
          {app.opportunity_id ? (
            <Link
              href={`/c/${slug}/career/opportunities/${app.opportunity_id}`}
              className="text-[14px] font-medium text-primary underline underline-offset-4"
            >
              From an opportunity
            </Link>
          ) : null}
        </div>
        <h1 className="text-balance text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
          {app.company}
        </h1>
        <p className="text-[18px] text-ink-muted">{app.role_title}</p>
        <p className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[15px] text-ink-muted">
          {app.deadline ? (
            <span
              className={
                overdue
                  ? "inline-flex items-center gap-1.5 font-semibold text-danger"
                  : "inline-flex items-center gap-1.5"
              }
            >
              <CalendarIcon aria-hidden="true" className="size-4" />
              Deadline {formatDate(app.deadline)}
              {words ? ` · ${words}` : ""}
            </span>
          ) : null}
          {app.applied_on ? <span>Applied {formatDate(app.applied_on)}</span> : null}
        </p>
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="outline">
            <Link href={`/c/${slug}/career/tracker/${app.id}/edit`}>
              <PencilIcon aria-hidden="true" /> Edit
            </Link>
          </Button>
          {app.source_url ? (
            <Button asChild variant="outline">
              <a href={app.source_url} target="_blank" rel="noopener noreferrer">
                <ExternalLinkIcon aria-hidden="true" /> Open the listing
              </a>
            </Button>
          ) : null}
          <Button variant="ghost" onClick={() => setDeleting(true)}>
            Delete
          </Button>
        </div>
      </header>

      <StatusChanger app={app} onChanged={reload} onConflict={() => setConflict(true)} />

      {app.notes ? (
        <section aria-labelledby="notes" className="max-w-prose">
          <h2
            id="notes"
            className="text-[13px] font-semibold uppercase tracking-[0.08em] text-ink-muted"
          >
            Notes
          </h2>
          <p className="mt-2 whitespace-pre-line text-[17px] leading-relaxed">{app.notes}</p>
        </section>
      ) : null}

      <section aria-labelledby="history" className="flex flex-col gap-3">
        <h2
          id="history"
          className="text-[13px] font-semibold uppercase tracking-[0.08em] text-ink-muted"
        >
          History
        </h2>
        <ol className="divide-y divide-border border-y border-border">
          {app.events.map((event) => (
            <li
              key={event.id}
              className="flex flex-col gap-0.5 py-3 sm:flex-row sm:justify-between sm:gap-6"
            >
              <p className="text-[16px]">
                {event.from_status ? (
                  <>
                    {STATUS_LABEL[event.from_status]} <span aria-hidden="true">→</span>
                    <span className="sr-only"> to </span>{" "}
                    <strong className="font-semibold">{STATUS_LABEL[event.to_status]}</strong>
                  </>
                ) : (
                  <>
                    Added as{" "}
                    <strong className="font-semibold">{STATUS_LABEL[event.to_status]}</strong>
                  </>
                )}
                {event.note ? <span className="text-ink-muted"> · {event.note}</span> : null}
              </p>
              <time dateTime={event.at} className="text-[14px] text-ink-muted">
                {whenWords(event.at)}
              </time>
            </li>
          ))}
        </ol>
      </section>

      <DeleteDialog app={app} open={deleting} onOpenChange={setDeleting} />
    </article>
  );
}

export function ApplicationDetailScreen({ id }: { id: string }) {
  const { slug } = useCollege();
  const state = useLoad(() => api.applications.one(id), [id]);
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-5 py-8 md:px-8 md:py-12">
      <Link
        href={`/c/${slug}/career`}
        className="-ml-1 inline-flex min-h-11 w-fit items-center rounded-input px-1 text-[15px] font-medium text-ink-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        ← My applications
      </Link>
      {state.status === "loading" ? (
        <div aria-busy="true" className="flex flex-col gap-4">
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : state.status === "error" ? (
        state.error instanceof ApiError && state.error.status === 404 ? (
          <div className="rounded-card border border-border p-8">
            <p className="text-lg font-semibold">This application is not here.</p>
            <p className="mt-1 text-ink-muted">It may have been deleted.</p>
          </div>
        ) : (
          <LoadError error={state.error} onRetry={state.reload} what="this application" />
        )
      ) : (
        <Body app={state.data} reload={state.reload} />
      )}
    </div>
  );
}
