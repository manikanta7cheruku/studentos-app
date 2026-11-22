"use client";

import * as React from "react";
import { CalendarClockIcon, MapPinIcon, UsersIcon } from "lucide-react";
import { PersonLink } from "@/components/app/person-link";
import { RemoveDialog } from "@/features/admin-console/remove-dialog";
import { ReportMenu } from "@/features/admin-console/report-menu";
import { Banner } from "@/components/ui/banner";
import { Skeleton } from "@/components/ui/skeleton";
import { Fact } from "@/components/app/glass-parts";
import { GlassSheet } from "@/components/app/glass-sheet";
import { LoadError } from "@/components/app/load-error";
import { PageHeader } from "@/components/app/page-header";
import { Spinner } from "@/components/app/spinner";
import { ApiError, friendlyMessage } from "@/lib/api-client";
import { api, type EventItem } from "@/lib/api/endpoints";
import { dayLabel } from "@/lib/format";
import { useLoad } from "@/lib/use-load";
import { useCollege } from "@/features/college";
import { DateTile, EventBadges, RsvpButton } from "./event-card";

/** Cancel an event: a glass sheet asks first, then says it is done. */
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
      setAsking(false);
      onDone();
    } catch (caught) {
      setAsking(false);
      setError(friendlyMessage(caught, "We could not cancel the event."));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="flex flex-col items-start gap-2">
      <button type="button" className="profile-btn w-full" onClick={() => setAsking(true)}>
        Cancel this event
      </button>
      {error ? <p className="text-[13px] text-danger">{error}</p> : null}
      <GlassSheet open={asking} onOpenChange={setAsking} title="Cancel this event?">
        <p className="text-[14px] leading-relaxed text-ink-muted">
          People who said they are going will not be told. This cannot be undone.
        </p>
        <div className="flex gap-2.5 pt-5">
          <button type="button" onClick={() => setAsking(false)} className="profile-btn flex-1">
            Keep it
          </button>
          <button
            type="button"
            onClick={() => void cancel()}
            disabled={busy}
            className="profile-btn profile-btn-primary flex-1"
          >
            {busy ? <Spinner /> : null} Cancel the event
          </button>
        </div>
      </GlassSheet>
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
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-5 pt-4 pb-2 md:px-8 md:py-8">
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
          <Skeleton className="h-56 w-full rounded-[24px]" />
          <Skeleton className="h-11 w-full rounded-full" />
        </div>
      ) : state.status === "error" ? (
        state.error instanceof ApiError && state.error.status === 404 ? (
          <div className="glass-card rounded-[24px] p-8">
            <p className="text-lg font-bold">This event is not available.</p>
            <p className="mt-1 text-ink-muted">
              It may have been removed, or it belongs to another space.
            </p>
          </div>
        ) : (
          <LoadError error={state.error} onRetry={state.reload} what="this event" />
        )
      ) : (
        <article className="flex flex-col gap-4">
          <section className="glass-card flex flex-col gap-5 rounded-[24px] p-5">
            <div className="flex items-start gap-3.5">
              <DateTile iso={state.data.starts_at} className="size-[3.75rem]" />
              <div className="min-w-0 flex-1">
                <div className="mb-1.5">
                  <EventBadges event={state.data} />
                </div>
                <h1 className="text-balance font-heading text-[1.45rem] font-extrabold leading-tight tracking-tight [overflow-wrap:anywhere]">
                  {state.data.title}
                </h1>
                <p className="mt-1 text-[13px] text-ink-muted">
                  Hosted by{" "}
                  <PersonLink
                    slug={slug}
                    userId={state.data.author.user_id}
                    className="font-medium text-ink"
                  >
                    {state.data.author.display_name}
                  </PersonLink>
                </p>
              </div>
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

            <div className="grid gap-4 sm:grid-cols-2">
              <Fact icon={<CalendarClockIcon />} label="When">
                {dayLabel(state.data.starts_at)}
                <span className="block text-[13px] font-normal text-ink-muted">
                  {new Date(state.data.starts_at).toLocaleTimeString(undefined, {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
              </Fact>
              {state.data.place ? (
                <Fact icon={<MapPinIcon />} label="Where">
                  {state.data.place}
                </Fact>
              ) : null}
              <Fact icon={<UsersIcon />} label="Going">
                <span className="tabular">
                  {state.data.going_count} going
                  {state.data.capacity ? ` of ${state.data.capacity}` : ""}
                </span>
                <span className="block text-[13px] font-normal text-ink-muted">
                  {state.data.capacity ? "Limited places" : "No limit"}
                </span>
              </Fact>
            </div>

            {state.data.description ? (
              <p className="whitespace-pre-line rounded-[14px] border border-white/10 bg-white/[0.04] px-3.5 py-3 text-[14.5px] leading-relaxed text-ink/90 [overflow-wrap:anywhere]">
                {state.data.description}
              </p>
            ) : null}
          </section>

          <RsvpButton event={state.data} size="lg" onChange={() => state.reload()} />
          {isModerator && !state.data.is_owner && state.data.status !== "removed" ? (
            <>
              <button
                type="button"
                className="profile-btn w-full"
                onClick={() => setRemoving(true)}
              >
                Remove this event
              </button>
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
