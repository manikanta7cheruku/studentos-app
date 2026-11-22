"use client";

import * as React from "react";
import Link from "next/link";
import { BadgeCheckIcon, CheckIcon, LockIcon, MapPinIcon, UserIcon, UsersIcon } from "lucide-react";
import { cn } from "cn";
import { GlassPill } from "@/components/app/glass-parts";
import { OutsideBadge } from "@/components/app/outside-badge";
import { api, type EventItem } from "@/lib/api/endpoints";
import { friendlyMessage } from "@/lib/api-client";
import { formatWhen } from "@/lib/format";
import { primeLoad } from "@/lib/use-load";
import { useCollege } from "@/features/college";

/** The day as a glass tile: the number big, the month small. */
export function DateTile({ iso, className }: { iso: string; className?: string }) {
  const date = new Date(iso);
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-14 shrink-0 flex-col items-center justify-center rounded-[16px] border border-white/[0.14] bg-white/[0.07] leading-none text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]",
        className,
      )}
    >
      <span className="tabular font-heading text-[1.35rem] font-extrabold">{date.getDate()}</span>
      <span className="mt-0.5 text-[10.5px] font-bold uppercase tracking-wider text-ink-muted">
        {date.toLocaleDateString(undefined, { month: "short" })}
      </span>
    </span>
  );
}

/** What kind of event it is: Official (a college admin made it), Personal event, and Invite only on top of those. */
export function EventBadges({ event }: { event: EventItem }) {
  const official = event.kind === "official";
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <GlassPill tone={official ? "good" : "quiet"} className="h-6 gap-1 px-2.5 text-[11.5px]">
        {official ? (
          <BadgeCheckIcon aria-hidden="true" className="size-3.5" />
        ) : (
          <UserIcon aria-hidden="true" className="size-3.5" />
        )}
        {official ? "Official" : "Personal event"}
      </GlassPill>
      {event.invite_only ? (
        <GlassPill tone="quiet" className="h-6 gap-1 px-2.5 text-[11.5px]">
          <LockIcon aria-hidden="true" className="size-3" /> Invite only
        </GlassPill>
      ) : null}
    </span>
  );
}

/** "I am going" as one button. It answers at once and goes back if the server says no. */
export function RsvpButton({
  event,
  size = "sm",
  space,
  onChange,
}: {
  event: EventItem;
  size?: "sm" | "lg";
  space?: string;
  onChange?: (next: EventItem) => void;
}) {
  const { slug: here } = useCollege();
  const slug = space ?? here;
  const [override, setOverride] = React.useState<{ going: boolean; from: string } | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const from = `${event.going}:${event.going_count}`;
  const going = override && override.from === from ? override.going : event.going;
  const full = event.capacity !== null && event.going_count >= event.capacity && !going;
  const closed = event.status === "cancelled" || event.status === "removed";

  async function toggle() {
    if (busy || closed) return;
    const next = !going;
    setOverride({ going: next, from });
    setError(null);
    setBusy(true);
    try {
      const saved = await api.events.rsvp(slug, event.id, next);
      setOverride({ going: saved.going, from: `${saved.going}:${saved.going_count}` });
      onChange?.(saved);
    } catch (caught) {
      setOverride(null);
      setError(friendlyMessage(caught, "We could not save that. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={cn("flex flex-col gap-1", size === "lg" ? "w-full" : "items-end")}>
      <button
        type="button"
        onClick={() => void toggle()}
        disabled={busy || full || closed}
        aria-pressed={going}
        className={cn(
          "profile-btn disabled:opacity-50",
          !going && !closed && !full && "profile-btn-primary",
          size === "lg" ? "w-full !h-11 !text-[15px]" : "!h-8 !px-3.5 !text-[12.5px]",
        )}
      >
        {going ? <CheckIcon aria-hidden="true" className="!size-4" /> : null}
        {closed ? "Cancelled" : full ? "Full" : going ? "Going" : "I am going"}
      </button>
      {error ? <p className="text-[12px] text-danger">{error}</p> : null}
    </div>
  );
}

/**
 * One event in a list, on glass. The day on the left, then the title (the link, stretched over the card) with the one button
 * on the right, when, where and how many go, and the tags on a row of their own.
 * `space` is set when it came from the public space.
 */
export function EventCard({
  event,
  space,
  onChange,
}: {
  event: EventItem;
  space?: string;
  onChange?: (next: EventItem) => void;
}) {
  const { slug: here } = useCollege();
  const slug = space ?? here;
  const outside = slug !== here;
  return (
    <li
      onClickCapture={() => primeLoad(`event:${slug}:${event.id}`, event)}
      className={cn(
        "lift glass-card relative flex items-start gap-3.5 rounded-[22px] p-4 focus-within:ring-2 focus-within:ring-ring",
        (event.status === "cancelled" || event.status === "removed") && "opacity-60",
      )}
    >
      <DateTile iso={event.starts_at} className="size-[3.25rem]" />
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-3">
          <h2 className="min-w-0 flex-1 text-balance text-[15.5px] font-bold leading-snug">
            <Link
              href={`/c/${slug}/events/${event.id}`}
              className="outline-none after:absolute after:inset-0 after:rounded-[22px]"
            >
              {event.title}
            </Link>
          </h2>
          <div className="relative z-10 shrink-0">
            <RsvpButton event={event} space={slug} onChange={onChange} />
          </div>
        </div>
        <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12.5px] text-ink-muted">
          <span>{formatWhen(event.starts_at)}</span>
          {event.place ? (
            <span className="flex min-w-0 items-center gap-1">
              <MapPinIcon aria-hidden="true" className="size-3.5 shrink-0" />
              <span className="truncate">{event.place}</span>
            </span>
          ) : null}
          <span className="tabular flex items-center gap-1">
            <UsersIcon aria-hidden="true" className="size-3.5" />
            {event.going_count} going
            {event.capacity ? ` of ${event.capacity}` : ""}
          </span>
        </p>
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <EventBadges event={event} />
          {outside ? <OutsideBadge /> : null}
        </div>
      </div>
    </li>
  );
}
