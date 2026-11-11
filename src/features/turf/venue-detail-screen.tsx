"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckIcon, ClockIcon, MapPinIcon } from "lucide-react";
import { cn } from "cn";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadError } from "@/components/app/load-error";
import { PageHeader } from "@/components/app/page-header";
import { Poster } from "@/components/app/poster";
import { Spinner } from "@/components/app/spinner";
import { ApiError, friendlyMessage } from "@/lib/api-client";
import { api, type Booking, type Venue } from "@/lib/api/endpoints";
import { formatInr } from "@/lib/format";
import { useAttempt } from "@/lib/use-attempt";
import { useLoad } from "@/lib/use-load";
import { useCollege } from "@/features/college";
import { BookingLine, BookingStatus, InvitePlayers } from "./booking-parts";
import { dayLabel, hourLabel, nextDays, priceLabel, rangeLabel, titleCase } from "./format";

/** The days as chips, and below them the hours of the chosen day. Tap a free hour, choose how long, ask. */
function BookingPanel({ venue }: { venue: Venue }) {
  const { slug } = useCollege();
  const attempt = useAttempt();
  const days = React.useMemo(() => nextDays(14), []);
  const [day, setDay] = React.useState(days[0]!.key);
  const [start, setStart] = React.useState<number | null>(null);
  const [hours, setHours] = React.useState(1);
  const [players, setPlayers] = React.useState("");
  const [note, setNote] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [sent, setSent] = React.useState<Booking | null>(null);
  const slots = useLoad(() => api.venues.slots(slug, venue.id, day), [slug, venue.id, day]);
  // The current hour, read once when the panel opens (hours already gone cannot be asked for today).
  const [nowHour] = React.useState(() => new Date().getHours());

  const byHour = new Map(
    slots.status === "ready" ? slots.data.map((slot) => [slot.hour, slot]) : [],
  );
  const past = (hour: number) => day === days[0]!.key && hour <= nowHour;
  const usable = (hour: number) => {
    const slot = byHour.get(hour);
    return Boolean(slot) && slot!.state === "free" && !past(hour);
  };
  // How many hours in a row are free from the chosen start (at most 4).
  let room = 0;
  if (start !== null) while (room < 4 && usable(start + room)) room += 1;
  const length = Math.min(hours, Math.max(room, 1));

  function pick(hour: number) {
    if (!usable(hour)) return;
    setSent(null);
    setError(null);
    setStart(hour);
    setHours(1);
  }

  async function submit() {
    if (start === null || busy) return;
    setBusy(true);
    setError(null);
    try {
      const made = await api.venues.book(
        slug,
        venue.id,
        {
          play_date: day,
          start_hour: start,
          hours: length,
          ...(players ? { players: Number(players) } : {}),
          note: note.trim(),
        },
        attempt.get(),
      );
      attempt.reset();
      setSent(made);
      setStart(null);
      setPlayers("");
      setNote("");
      slots.reload();
    } catch (caught) {
      if (!(caught instanceof ApiError && caught.isOffline)) attempt.reset();
      if (caught instanceof ApiError && caught.code === "SLOTS_FULL")
        setError("Someone just booked those hours. Pick other hours.");
      else if (caught instanceof ApiError && caught.code === "ALREADY_REQUESTED")
        setError("You already asked for these hours.");
      else setError(friendlyMessage(caught, "We could not send your request. Please try again."));
      slots.reload();
    } finally {
      setBusy(false);
    }
  }

  const total =
    venue.price_inr_per_hour !== null && start !== null ? venue.price_inr_per_hour * length : null;

  return (
    <section
      aria-labelledby="book"
      className="glass-card flex flex-col gap-4 rounded-[24px] p-4 md:p-5"
    >
      <h2 id="book" className="font-heading text-[1.15rem] font-extrabold">
        Pick a time
      </h2>

      <div
        role="group"
        aria-label="Day"
        className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:-mx-5 md:px-5"
      >
        {days.map((item) => (
          <button
            key={item.key}
            type="button"
            aria-pressed={day === item.key}
            onClick={() => {
              setDay(item.key);
              setStart(null);
              setSent(null);
              setError(null);
            }}
            className={cn(
              "flex w-[4.4rem] shrink-0 snap-start flex-col items-center rounded-2xl border px-2 py-2 outline-none transition-[background-color,border-color,transform] duration-200 focus-visible:ring-2 focus-visible:ring-ring active:scale-95",
              day === item.key
                ? "bg-brand border-transparent text-white"
                : "border-white/10 bg-white/[0.04] text-ink-muted hover:border-white/25 hover:text-ink",
            )}
          >
            <span className="text-[11.5px] font-semibold">{item.top}</span>
            <span className="text-[13px] font-bold">{item.day}</span>
          </button>
        ))}
      </div>

      <div aria-live="polite">
        {slots.status === "loading" ? (
          <div aria-busy="true" className="grid grid-cols-4 gap-2">
            {Array.from({ length: 8 }).map((_, n) => (
              <Skeleton key={n} className="h-14 rounded-2xl" />
            ))}
          </div>
        ) : slots.status === "error" ? (
          <LoadError error={slots.error} onRetry={slots.reload} what="the hours" />
        ) : (
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {slots.data.map((slot) => {
              const free = usable(slot.hour);
              const chosen = start !== null && slot.hour >= start && slot.hour < start + length;
              return (
                <li key={slot.hour}>
                  <button
                    type="button"
                    disabled={!free}
                    aria-pressed={chosen}
                    onClick={() => pick(slot.hour)}
                    className={cn(
                      "flex h-14 w-full flex-col items-center justify-center rounded-2xl border text-center outline-none transition-[background-color,border-color,transform,opacity] duration-200 focus-visible:ring-2 focus-visible:ring-ring",
                      chosen
                        ? "bg-brand border-transparent text-white shadow-[0_8px_18px_-10px_rgba(8,6,30,0.7)]"
                        : slot.mine
                          ? "border-success/40 bg-success/10 text-success"
                          : free
                            ? "border-white/10 bg-white/[0.05] hover:border-white/30 hover:bg-white/[0.09] active:scale-95"
                            : "border-white/[0.06] bg-white/[0.02] text-ink-muted/60",
                    )}
                  >
                    <span className="text-[14px] font-bold">{hourLabel(slot.hour)}</span>
                    <span className="text-[11px] font-medium opacity-80">
                      {slot.mine
                        ? "Yours"
                        : slot.state === "booked"
                          ? "Booked"
                          : past(slot.hour)
                            ? "Gone"
                            : slot.requests > 0
                              ? `${slot.requests} asked`
                              : "Free"}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {start !== null ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3.5">
          <p className="text-[14.5px] font-semibold">
            {dayLabel(day)}, {rangeLabel(start, length)}
            {total !== null ? (
              <span className="ml-2 font-normal text-ink-muted">about {formatInr(total)}</span>
            ) : null}
          </p>
          <div role="group" aria-label="How long" className="flex gap-2">
            {[1, 2, 3, 4].map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={length === value}
                disabled={value > room}
                onClick={() => setHours(value)}
                className={cn(
                  "h-9 flex-1 rounded-xl border text-[13px] font-semibold outline-none transition-[background-color,border-color] duration-200 focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40",
                  length === value
                    ? "bg-white/[0.14] border-white/25"
                    : "border-white/10 bg-white/[0.03] text-ink-muted hover:text-ink",
                )}
              >
                {value} h
              </button>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-[8rem_1fr]">
            <label className="flex flex-col gap-1.5 text-[12.5px] font-semibold text-ink-muted">
              How many play?
              <Input
                inputMode="numeric"
                value={players}
                onChange={(event) => setPlayers(event.target.value.replace(/\D/g, "").slice(0, 2))}
                placeholder="Optional"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-[12.5px] font-semibold text-ink-muted">
              A note for the venue
              <Input
                value={note}
                onChange={(event) => setNote(event.target.value)}
                maxLength={300}
                placeholder="Optional"
              />
            </label>
          </div>
          {error ? (
            <Banner variant="error">
              <p>{error}</p>
            </Banner>
          ) : null}
          <Button size="lg" onClick={() => void submit()} disabled={busy}>
            {busy ? <Spinner /> : null} Ask to book
          </Button>
          <p className="text-[12.5px] text-ink-muted">
            {venue.manager} confirms by hand and you get a notification. You can cancel any time.
          </p>
        </div>
      ) : null}

      {sent ? (
        <Banner variant="success" title="Request sent">
          <p>
            {sent.venue_name}: {dayLabel(sent.play_date)}, {rangeLabel(sent.start_hour, sent.hours)}
            . You will be told when it is answered.
          </p>
          <p className="mt-2 flex flex-wrap gap-x-4">
            <InvitePlayers slug={slug} booking={sent} />
            <Link
              href={`/c/${slug}/turf/bookings`}
              className="inline-flex min-h-9 items-center text-[13px] font-semibold text-[#b9b4ee] underline-offset-4 hover:underline"
            >
              My bookings
            </Link>
          </p>
        </Banner>
      ) : null}
    </section>
  );
}

/** For the venue's manager: the requests, with one tap to confirm or decline, and a way to hide the venue. */
function ManagerPanel({ venue, onHidden }: { venue: Venue; onHidden: () => void }) {
  const { slug } = useCollege();
  const requests = useLoad(() => api.venues.requests(slug, venue.id), [slug, venue.id]);
  const [error, setError] = React.useState<string | null>(null);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [notes, setNotes] = React.useState<Record<string, string>>({});
  const [confirmHide, setConfirmHide] = React.useState(false);
  const [hiding, setHiding] = React.useState(false);

  async function decide(id: string, decision: "confirmed" | "declined") {
    setBusyId(id);
    setError(null);
    try {
      await api.venues.decide(slug, id, decision, notes[id]?.trim() || undefined);
      requests.reload();
    } catch (caught) {
      if (caught instanceof ApiError && caught.code === "SLOTS_FULL")
        setError("Another confirmed booking already covers those hours. Decline this one.");
      else setError(friendlyMessage(caught, "That did not work. Please try again."));
      requests.reload();
    } finally {
      setBusyId(null);
    }
  }

  async function hide() {
    setHiding(true);
    setError(null);
    try {
      await api.venues.hide(slug, venue.id);
      onHidden();
    } catch (caught) {
      setError(friendlyMessage(caught, "We could not hide the venue."));
      setHiding(false);
    }
  }

  return (
    <section
      aria-labelledby="requests"
      className="glass-card flex flex-col gap-3 rounded-[24px] p-4 md:p-5"
    >
      <h2 id="requests" className="font-heading text-[1.15rem] font-extrabold">
        Booking requests
      </h2>
      {error ? (
        <Banner variant="error">
          <p>{error}</p>
        </Banner>
      ) : null}
      {requests.status === "loading" ? (
        <Skeleton className="h-24 w-full rounded-2xl" />
      ) : requests.status === "error" ? (
        <LoadError error={requests.error} onRetry={requests.reload} what="the requests" />
      ) : requests.data.length === 0 ? (
        <p className="text-[14px] text-ink-muted">
          No requests yet. They appear here and in your notifications.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {requests.data.map((request) => (
            <li
              key={request.id}
              className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-3.5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Link
                  href={`/c/${slug}/people/${request.requester.user_id}`}
                  className="text-[14.5px] font-semibold hover:underline"
                >
                  {request.requester.display_name}
                </Link>
                <BookingStatus status={request.status} />
              </div>
              <div className="mt-1">
                <BookingLine booking={request} />
              </div>
              {request.note ? (
                <p className="mt-1.5 text-[13.5px] text-ink">&ldquo;{request.note}&rdquo;</p>
              ) : null}
              {request.status === "pending" ? (
                <div className="mt-3 flex flex-col gap-2">
                  <Input
                    aria-label={`A note for ${request.requester.display_name}`}
                    value={notes[request.id] ?? ""}
                    onChange={(event) =>
                      setNotes((current) => ({ ...current, [request.id]: event.target.value }))
                    }
                    maxLength={300}
                    placeholder="A note for them (optional)"
                    className="h-10"
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={() => void decide(request.id, "confirmed")}
                      disabled={busyId === request.id}
                    >
                      {busyId === request.id ? <Spinner /> : <CheckIcon aria-hidden="true" />}{" "}
                      Confirm
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => void decide(request.id, "declined")}
                      disabled={busyId === request.id}
                    >
                      Decline
                    </Button>
                  </div>
                </div>
              ) : request.manager_note ? (
                <p className="mt-1.5 text-[13px] text-ink-muted">
                  Your note: {request.manager_note}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      <div className="border-t border-white/[0.08] pt-3">
        {confirmHide ? (
          <div className="flex flex-wrap items-center gap-2 text-[13.5px]">
            <span className="text-ink-muted">
              Hide it? Waiting requests are declined and those people are told.
            </span>
            <Button variant="destructive" size="sm" onClick={() => void hide()} disabled={hiding}>
              {hiding ? <Spinner /> : "Hide the venue"}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirmHide(false)}>
              Keep it
            </Button>
          </div>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => setConfirmHide(true)}>
            Hide this venue
          </Button>
        )}
      </div>
    </section>
  );
}

export function VenueDetailScreen({ venueId }: { venueId: string }) {
  const { slug } = useCollege();
  const router = useRouter();
  const state = useLoad(
    () => api.venues.one(slug, venueId),
    [slug, venueId],
    `venue:${slug}:${venueId}`,
  );

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-5 py-6 md:px-8 md:py-10">
      <PageHeader title="Venue" back={{ href: `/c/${slug}/turf`, label: "Turf and courts" }} />
      {state.status === "loading" ? (
        <div aria-busy="true" className="flex flex-col gap-3">
          <Skeleton className="h-40 w-full rounded-3xl" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-56 w-full rounded-3xl" />
        </div>
      ) : state.status === "error" ? (
        state.error instanceof ApiError && state.error.status === 404 ? (
          <div className="glass-card rounded-[22px] p-8">
            <p className="text-lg font-bold">This venue is not available.</p>
            <p className="mt-1 text-ink-muted">
              It may have been hidden, or it belongs to another space.
            </p>
          </div>
        ) : (
          <LoadError error={state.error} onRetry={state.reload} what="this venue" />
        )
      ) : (
        <>
          <Poster
            seed={state.data.id}
            big={titleCase(state.data.sports[0] ?? "Play")}
            className="h-40 rounded-[26px] p-4"
          >
            <div className="flex flex-wrap gap-1.5">
              {state.data.sports.map((sport) => (
                <span
                  key={sport}
                  className="glass inline-flex h-7 items-center rounded-full px-3 text-[12px] font-semibold"
                >
                  {titleCase(sport)}
                </span>
              ))}
            </div>
          </Poster>
          <div>
            <h1 className="text-balance font-heading text-[1.7rem] font-extrabold leading-tight tracking-tight">
              {state.data.name}
            </h1>
            <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13.5px] text-ink-muted">
              {state.data.area ? (
                <span className="inline-flex items-center gap-1.5">
                  <MapPinIcon aria-hidden="true" className="size-4" />
                  {state.data.area}
                </span>
              ) : null}
              <span className="inline-flex items-center gap-1.5">
                <ClockIcon aria-hidden="true" className="size-4" />
                {hourLabel(state.data.open_hour)} to {hourLabel(state.data.close_hour)}
              </span>
              <span className="font-semibold text-[#b9b4ee]">{priceLabel(state.data)}</span>
            </p>
            <p className="mt-1 text-[13px] text-ink-muted">Run by {state.data.manager}</p>
          </div>
          {state.data.description ? (
            <p className="whitespace-pre-line text-[15px] leading-relaxed text-ink/90">
              {state.data.description}
            </p>
          ) : null}
          <BookingPanel venue={state.data} />
          {state.data.is_manager ? (
            <ManagerPanel venue={state.data} onHidden={() => router.push(`/c/${slug}/turf`)} />
          ) : null}
        </>
      )}
    </div>
  );
}
