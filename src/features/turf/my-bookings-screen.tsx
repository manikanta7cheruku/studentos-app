"use client";

import * as React from "react";
import Link from "next/link";
import { CalendarCheckIcon } from "lucide-react";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadError } from "@/components/app/load-error";
import { PageHeader } from "@/components/app/page-header";
import { Spinner } from "@/components/app/spinner";
import { friendlyMessage } from "@/lib/api-client";
import { api, type Booking } from "@/lib/api/endpoints";
import { useLoad } from "@/lib/use-load";
import { useCollege } from "@/features/college";
import { BookingLine, BookingStatus, InvitePlayers } from "./booking-parts";

function BookingCard({
  booking,
  upcoming,
  onChanged,
}: {
  booking: Booking;
  upcoming: boolean;
  onChanged: () => void;
}) {
  const { slug } = useCollege();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function cancel() {
    setBusy(true);
    setError(null);
    try {
      await api.venues.cancel(slug, booking.id);
      onChanged();
    } catch (caught) {
      setError(friendlyMessage(caught, "We could not cancel it. Please try again."));
      setBusy(false);
    }
  }

  return (
    <li className="glass-card flex flex-col gap-2 rounded-[22px] p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <Link
          href={`/c/${slug}/turf/${booking.venue_id}`}
          className="text-[16px] font-bold leading-snug hover:underline"
        >
          {booking.venue_name}
        </Link>
        <BookingStatus status={booking.status} />
      </div>
      <BookingLine booking={booking} />
      {booking.manager_note ? (
        <p className="text-[13.5px] text-ink">&ldquo;{booking.manager_note}&rdquo;</p>
      ) : null}
      {error ? <p className="text-[13px] text-danger">{error}</p> : null}
      {upcoming && (booking.status === "pending" || booking.status === "confirmed") ? (
        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
          {booking.status === "confirmed" ? <InvitePlayers slug={slug} booking={booking} /> : null}
          <Button variant="ghost" size="sm" onClick={() => void cancel()} disabled={busy}>
            {busy ? <Spinner /> : null} Cancel
          </Button>
        </div>
      ) : null}
    </li>
  );
}

/** My booking requests: the ones coming up first, then the old ones. */
export function MyBookingsScreen() {
  const { slug } = useCollege();
  const state = useLoad(() => api.venues.mine(slug), [slug]);
  // Today as a day key, read once when the screen opens.
  const [today] = React.useState(() => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  });

  const upcoming =
    state.status === "ready"
      ? state.data
          .filter((item) => item.play_date >= today)
          .sort((a, b) => a.play_date.localeCompare(b.play_date) || a.start_hour - b.start_hour)
      : [];
  const earlier =
    state.status === "ready" ? state.data.filter((item) => item.play_date < today) : [];

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-5 pt-1 md:px-8 md:py-8">
      <PageHeader
        title="My bookings"
        description="The hours you asked for. The venue answers, and you are told."
        back={{ href: `/c/${slug}/turf`, label: "Turf and courts" }}
      />
      {state.status === "loading" ? (
        <div aria-busy="true" className="flex flex-col gap-3">
          <Skeleton className="h-28 w-full rounded-[22px]" />
          <Skeleton className="h-28 w-full rounded-[22px]" />
        </div>
      ) : state.status === "error" ? (
        <LoadError error={state.error} onRetry={state.reload} what="your bookings" />
      ) : state.data.length === 0 ? (
        <div className="glass-card flex flex-col items-center gap-3 rounded-[24px] px-6 py-12 text-center">
          <span className="bg-brand inline-flex size-12 items-center justify-center rounded-2xl text-white">
            <CalendarCheckIcon aria-hidden="true" className="size-6" />
          </span>
          <p className="text-lg font-bold">No bookings yet</p>
          <p className="max-w-[30ch] text-[14px] text-ink-muted">
            Pick a turf and a free hour, and your requests show up here.
          </p>
          <Button asChild className="mt-1">
            <Link href={`/c/${slug}/turf`}>Find a turf</Link>
          </Button>
        </div>
      ) : (
        <>
          {upcoming.length > 0 ? (
            <section aria-labelledby="coming" className="flex flex-col gap-3">
              <h2
                id="coming"
                className="text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-muted"
              >
                Coming up
              </h2>
              <ul className="stagger flex flex-col gap-3">
                {upcoming.map((item) => (
                  <BookingCard key={item.id} booking={item} upcoming onChanged={state.reload} />
                ))}
              </ul>
            </section>
          ) : (
            <Banner variant="info">
              <p>Nothing coming up. Find a turf and ask for an hour.</p>
            </Banner>
          )}
          {earlier.length > 0 ? (
            <section aria-labelledby="earlier" className="flex flex-col gap-3">
              <h2
                id="earlier"
                className="text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-muted"
              >
                Earlier
              </h2>
              <ul className="flex flex-col gap-3 opacity-80">
                {earlier.map((item) => (
                  <BookingCard
                    key={item.id}
                    booking={item}
                    upcoming={false}
                    onChanged={state.reload}
                  />
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
