import { adminClient } from "@/server/admin/supabase-admin";
import { toIso } from "@/lib/api";
import { mapDbError } from "@/lib/db-error";

// Wrappers around the turf booking SQL functions (migration 20261118000000, functions venue_* and booking_*).
// Every function checks again, inside the database, that the actor is an active member of the college, and who may manage
// a venue. The actor and the college come from the verified login and from requireMember, never from the request body.

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await adminClient().rpc(fn, args);
  if (error) throw mapDbError(error);
  return data as T;
}

type Json = Record<string, unknown>;
const dated = (item: Json) => ({ ...item, created_at: toIso(item.created_at as string) });

export async function createVenue(
  actor: string,
  college: string,
  input: {
    name: string;
    description: string;
    sports: string[];
    area?: string;
    price_inr_per_hour?: number;
    open_hour: number;
    close_hour: number;
  },
) {
  return dated(
    await rpc<Json>("venue_create", {
      p_actor: actor,
      p_college: college,
      p_name: input.name,
      p_description: input.description,
      p_sports: input.sports.map((sport) => sport.toLowerCase()),
      p_area: input.area ?? null,
      p_price: input.price_inr_per_hour ?? null,
      p_open: input.open_hour,
      p_close: input.close_hour,
    }),
  );
}

export async function listVenues(
  actor: string,
  college: string,
  input: { sport?: string; limit: number },
) {
  const rows = await rpc<{ id: string; item: Json }[] | null>("venue_list", {
    p_actor: actor,
    p_college: college,
    p_sport: input.sport?.toLowerCase() ?? null,
    p_limit: input.limit,
  });
  return (rows ?? []).map((row) => dated(row.item));
}

export async function getVenue(actor: string, college: string, id: string) {
  return dated(await rpc<Json>("venue_get", { p_actor: actor, p_college: college, p_venue: id }));
}

export async function hideVenue(actor: string, college: string, id: string) {
  return rpc<Json>("venue_hide", { p_actor: actor, p_college: college, p_venue: id });
}

export async function venueSlots(actor: string, college: string, id: string, date: string) {
  return rpc<Json[]>("venue_slots", {
    p_actor: actor,
    p_college: college,
    p_venue: id,
    p_date: date,
  });
}

export async function requestBooking(
  actor: string,
  college: string,
  venue: string,
  input: { play_date: string; start_hour: number; hours: number; players?: number; note: string },
) {
  return dated(
    await rpc<Json>("booking_request", {
      p_actor: actor,
      p_college: college,
      p_venue: venue,
      p_date: input.play_date,
      p_start: input.start_hour,
      p_hours: input.hours,
      p_players: input.players ?? null,
      p_note: input.note,
    }),
  );
}

export async function myBookings(actor: string, college: string, limit: number) {
  const rows = await rpc<{ id: string; item: Json }[] | null>("booking_list_mine", {
    p_actor: actor,
    p_college: college,
    p_limit: limit,
  });
  return (rows ?? []).map((row) => dated(row.item));
}

export async function venueBookings(
  actor: string,
  college: string,
  venue: string,
  input: { status?: string; limit: number },
) {
  const rows = await rpc<{ id: string; item: Json }[] | null>("booking_list_venue", {
    p_actor: actor,
    p_college: college,
    p_venue: venue,
    p_status: input.status ?? null,
    p_limit: input.limit,
  });
  return (rows ?? []).map((row) => dated(row.item));
}

export async function decideBooking(
  actor: string,
  college: string,
  booking: string,
  input: { decision: "confirmed" | "declined"; note?: string },
) {
  return dated(
    await rpc<Json>("booking_decide", {
      p_actor: actor,
      p_college: college,
      p_booking: booking,
      p_decision: input.decision,
      p_note: input.note ?? null,
    }),
  );
}

export async function cancelBooking(actor: string, college: string, booking: string) {
  return dated(
    await rpc<Json>("booking_cancel", { p_actor: actor, p_college: college, p_booking: booking }),
  );
}
