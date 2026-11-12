"use client";

import { RemoveDialog } from "@/features/admin-console/remove-dialog";
import { ReportMenu } from "@/features/admin-console/report-menu";
import * as React from "react";
import { CalendarIcon, MapPinIcon, UsersIcon } from "lucide-react";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadError } from "@/components/app/load-error";
import { PageHeader } from "@/components/app/page-header";
import { Poster } from "@/components/app/poster";
import { Spinner } from "@/components/app/spinner";
import { ApiError, friendlyMessage } from "@/lib/api-client";
import { api, type EventItem } from "@/lib/api/endpoints";
import { formatWhen } from "@/lib/format";
import { useLoad } from "@/lib/use-load";
import { useCollege } from "@/features/college";
import { EventBadges, RsvpButton } from "./event-card";

function CancelEvent({ event, onDone }: { event: EventItem; onDone: () => void }) {
  const { slug } = useCollege();
  const [asking, setAsking] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  async function cancel() {
    setBusy(true);
    setError(null);
    try {
      await api.events.cancel(slug, event.id);
      onDone();
    } catch (caught) {
      setError(friendlyMessage(caught, "We could not cancel the event."));
    } finally {
      setBusy(false);
      setAsking(false);
    }
  }
  if (!asking) {
    return (
      <div className="flex flex-col items-start gap-2">
        <Button variant="ghost" onClick={() => setAsking(true)}>
          Cancel this event
        </Button>
        {error ? <p className="text-[13px] text-danger">{error}</p> : null}
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-[14px]">
      <span className="mr-1 text-ink-muted">
        People who said they are going will not be told. Cancel it?
      </span>
      <Button variant="destructive" size="sm" onClick={() => void cancel()} disabled={busy}>
        {busy ? <Spinner /> : null} Cancel the event
      </Button>
      <Button variant="ghost" size="sm" onClick={() => setAsking(false)}>
        Keep it
      </Button>
    </div>
  );
}

export function EventDetailScreen({ eventId }: { eventId: string }) {
  const { slug, isModerator } = useCollege();
  const state = useLoad(
    () => api.events.one(slug, eventId),
    [slug, eventId],
    `event:${slug}:${eventId}`,
  );
  const [removing, setRemoving] = React.useState(false);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-5 pt-4 pb-2 md:px-8 md:py-8">
      <PageHeader
        title="Event"
        back={{ href: `/c/${slug}/events`, label: "Events" }}
        menu={
          state.status === "ready" && !state.data.is_owner ? (
            <ReportMenu targetType="event" targetId={state.data.id} what="event" />
          ) : undefined
        }
      />
      {state.status === "loading" ? (
        <div aria-busy="true" className="flex flex-col gap-3">
          <Skeleton className="h-40 w-full rounded-3xl" />
          <Skeleton className="h-8 w-3/4" />
        </div>
      ) : state.status === "error" ? (
        state.error instanceof ApiError && state.error.status === 404 ? (
          <div className="rounded-card border border-white/10 bg-white/[0.03] p-8">
            <p className="text-lg font-bold">This event is not available.</p>
            <p className="mt-1 text-ink-muted">
              It may have been removed, or it belongs to another space.
            </p>
          </div>
        ) : (
          <LoadError error={state.error} onRetry={state.reload} what="this event" />
        )
      ) : (
        <article className="flex flex-col gap-5">
          <Poster
            seed={state.data.id}
            big={String(new Date(state.data.starts_at).getDate())}
            className="h-40 rounded-[26px] p-4"
          >
            <span className="glass inline-flex h-7 items-center rounded-full px-3 text-[12px] font-semibold">
              {new Date(state.data.starts_at).toLocaleDateString(undefined, {
                month: "long",
                year: "numeric",
              })}
            </span>
          </Poster>
          <div>
            <div className="mb-2">
              <EventBadges event={state.data} />
            </div>
            <h1 className="text-balance font-heading text-[1.7rem] font-extrabold leading-tight tracking-tight">
              {state.data.title}
            </h1>
            <p className="mt-1.5 text-[13.5px] text-ink-muted">
              Hosted by {state.data.author.display_name}
            </p>
          </div>
          {state.data.status === "removed" ? (
            <Banner variant="info" title="This event was removed">
              <p>A moderator took it down.</p>
            </Banner>
          ) : null}
          {state.data.status === "cancelled" ? (
            <Banner variant="info" title="This event was cancelled">
              <p>Nothing will happen at this time.</p>
            </Banner>
          ) : null}
          <ul className="flex flex-col gap-2.5 text-[14.5px]">
            <li className="flex items-center gap-2.5">
              <CalendarIcon aria-hidden="true" className="size-[18px] text-ink-muted" />
              {formatWhen(state.data.starts_at)}
            </li>
            {state.data.place ? (
              <li className="flex items-center gap-2.5">
                <MapPinIcon aria-hidden="true" className="size-[18px] text-ink-muted" />
                {state.data.place}
              </li>
            ) : null}
            <li className="tabular flex items-center gap-2.5">
              <UsersIcon aria-hidden="true" className="size-[18px] text-ink-muted" />
              {state.data.going_count} going
              {state.data.capacity ? ` of ${state.data.capacity}` : ""}
            </li>
          </ul>
          {state.data.description ? (
            <p className="whitespace-pre-line text-[15px] leading-relaxed text-ink/90">
              {state.data.description}
            </p>
          ) : null}
          <RsvpButton event={state.data} size="lg" onChange={() => state.reload()} />
          {isModerator && !state.data.is_owner && state.data.status !== "removed" ? (
            <>
              <Button variant="outline" onClick={() => setRemoving(true)}>
                Remove this event
              </Button>
              <RemoveDialog
                slug={slug}
                kind="event"
                id={state.data.id}
                open={removing}
                onOpenChange={setRemoving}
                onRemoved={state.reload}
              />
            </>
          ) : null}
          {(state.data.is_owner || isModerator) && state.data.status === "published" ? (
            <CancelEvent event={state.data} onDone={state.reload} />
          ) : null}
        </article>
      )}
    </div>
  );
}
