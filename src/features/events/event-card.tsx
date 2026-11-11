"use client";

import * as React from "react";
import Link from "next/link";
import { CheckIcon, MapPinIcon, UsersIcon } from "lucide-react";
import { cn } from "cn";
import { Poster } from "@/components/app/poster";
import { api, type EventItem } from "@/lib/api/endpoints";
import { friendlyMessage } from "@/lib/api-client";
import { formatWhen } from "@/lib/format";
import { useCollege } from "@/features/college";

/** The day as a small tile: the number big, the month small. */
export function DateTile({ iso, className }: { iso: string; className?: string }) {
  const date = new Date(iso);
  return (
    <Poster
      seed={iso.slice(0, 10)}
      className={cn(
        "flex size-14 shrink-0 flex-col items-center justify-center rounded-2xl",
        className,
      )}
    >
      <div className="flex h-full flex-col items-center justify-center leading-none text-white">
        <span className="font-heading text-[1.35rem] font-extrabold">{date.getDate()}</span>
        <span className="mt-0.5 text-[10.5px] font-bold uppercase tracking-wider text-white/85">
          {date.toLocaleDateString(undefined, { month: "short" })}
        </span>
      </div>
    </Poster>
  );
}

/** "I am going" as one button. It answers at once and goes back if the server says no. */
export function RsvpButton({
  event,
  size = "sm",
  onChange,
}: {
  event: EventItem;
  size?: "sm" | "lg";
  onChange?: (next: EventItem) => void;
}) {
  const { slug } = useCollege();
  const [override, setOverride] = React.useState<{ going: boolean; from: string } | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const from = `${event.going}:${event.going_count}`;
  const going = override && override.from === from ? override.going : event.going;
  const full = event.capacity !== null && event.going_count >= event.capacity && !going;
  const closed = event.status === "cancelled";

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
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={() => void toggle()}
        disabled={busy || full || closed}
        aria-pressed={going}
        className={cn(
          "inline-flex items-center justify-center gap-1.5 rounded-full font-semibold outline-none transition-[transform,background-color,color,border-color,filter] duration-200 focus-visible:ring-2 focus-visible:ring-ring active:scale-95 disabled:opacity-50",
          size === "lg" ? "h-12 w-full text-[15px]" : "h-9 px-4 text-[13px]",
          going
            ? "border border-[#8a6bff]/50 bg-[#8a6bff]/15 text-[#d4c9ff] hover:bg-[#8a6bff]/25"
            : "bg-brand text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_8px_20px_-10px_rgba(154,63,230,0.8)] hover:brightness-110",
        )}
      >
        {going ? <CheckIcon aria-hidden="true" className="size-4" /> : null}
        {closed ? "Cancelled" : full ? "Full" : going ? "Going" : "I am going"}
      </button>
      {error ? <p className="text-[12px] text-danger">{error}</p> : null}
    </div>
  );
}

/** One event in a list. The title is the link, stretched over the card. */
export function EventCard({
  event,
  onChange,
}: {
  event: EventItem;
  onChange?: (next: EventItem) => void;
}) {
  const { slug } = useCollege();
  return (
    <li
      className={cn(
        "lift relative flex items-start gap-3.5 rounded-[20px] border border-white/[0.08] bg-surface p-4 focus-within:ring-2 focus-within:ring-ring",
        event.status === "cancelled" && "opacity-60",
      )}
    >
      <DateTile iso={event.starts_at} />
      <div className="min-w-0 flex-1">
        <h2 className="text-balance text-[1.05rem] font-bold leading-snug">
          <Link
            href={`/c/${slug}/events/${event.id}`}
            className="outline-none after:absolute after:inset-0"
          >
            {event.title}
          </Link>
        </h2>
        <p className="mt-1 text-[13px] text-ink-muted">{formatWhen(event.starts_at)}</p>
        {event.place ? (
          <p className="mt-0.5 flex items-center gap-1.5 text-[13px] text-ink-muted">
            <MapPinIcon aria-hidden="true" className="size-3.5 shrink-0" />
            <span className="truncate">{event.place}</span>
          </p>
        ) : null}
        <div className="relative z-10 mt-3 flex items-center justify-between gap-3">
          <span className="tabular flex items-center gap-1.5 text-[12.5px] font-semibold text-ink-muted">
            <UsersIcon aria-hidden="true" className="size-4" />
            {event.going_count} going
            {event.capacity ? ` of ${event.capacity}` : ""}
          </span>
          <RsvpButton event={event} onChange={onChange} />
        </div>
      </div>
    </li>
  );
}
