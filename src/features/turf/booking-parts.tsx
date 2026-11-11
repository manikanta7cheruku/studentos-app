"use client";

import * as React from "react";
import Link from "next/link";
import { CalendarIcon, UsersIcon } from "lucide-react";
import { cn } from "cn";
import type { Booking } from "@/lib/api/endpoints";
import { atHour, dayLabel, rangeLabel } from "./format";

const STATUS_WORDS: Record<Booking["status"], string> = {
  pending: "Waiting for the venue",
  confirmed: "Confirmed",
  declined: "Not available",
  cancelled: "Cancelled",
};

/** The state of a request, in words (colour only helps). */
export function BookingStatus({ status }: { status: Booking["status"] }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-full px-2.5 text-[12px] font-semibold",
        status === "confirmed" && "bg-success/15 text-success",
        status === "pending" && "bg-warning/15 text-warning",
        (status === "declined" || status === "cancelled") && "bg-white/[0.07] text-ink-muted",
      )}
    >
      {STATUS_WORDS[status]}
    </span>
  );
}

/** A link that starts a plan for the booked hours: a sport plan with the venue as the place and the time filled in. */
export function planLink(
  slug: string,
  venueName: string,
  playDate: string,
  startHour: number,
): string {
  const params = new URLSearchParams({
    kind: "sport",
    place: venueName,
    when: atHour(playDate, startHour).toISOString(),
  });
  return `/c/${slug}/collaborate/new?${params}`;
}

/** What a request asks for, in one line: the day, the hours, how many people. */
export function BookingLine({ booking }: { booking: Booking }) {
  return (
    <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13.5px] text-ink-muted">
      <span className="inline-flex items-center gap-1.5">
        <CalendarIcon aria-hidden="true" className="size-3.5" />
        {dayLabel(booking.play_date)}, {rangeLabel(booking.start_hour, booking.hours)}
      </span>
      {booking.players ? (
        <span className="inline-flex items-center gap-1.5">
          <UsersIcon aria-hidden="true" className="size-3.5" />
          {booking.players} players
        </span>
      ) : null}
    </p>
  );
}

export function InvitePlayers({
  slug,
  booking,
}: {
  slug: string;
  booking: Pick<Booking, "venue_name" | "play_date" | "start_hour">;
}) {
  return (
    <Link
      href={planLink(slug, booking.venue_name, booking.play_date, booking.start_hour)}
      className="inline-flex min-h-9 items-center gap-1.5 text-[13px] font-semibold text-[#b9b4ee] underline-offset-4 hover:underline"
    >
      <UsersIcon aria-hidden="true" className="size-4" /> Find players for this slot
    </Link>
  );
}
