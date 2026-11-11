import { z } from "zod";
import { isoDateTime, successEnvelope, uuid } from "./common";

// ---------------------------------------------------------------------------
// Turf and court booking (VEN-01 to VEN-10): a venue directory and booking requests that the venue's manager confirms
// by hand. No payments. Rules: docs/API_CONTRACT.md section 18.
// ---------------------------------------------------------------------------

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use the form 2026-11-20");

export const venueItem = z.object({
  id: uuid,
  name: z.string(),
  description: z.string(),
  sports: z.array(z.string()),
  area: z.string().nullable(),
  // Whole rupees for one hour. null = ask the venue.
  price_inr_per_hour: z.number().int().nullable(),
  // The hours it can be booked: from open_hour up to (not including) close_hour, on a 24 hour clock.
  open_hour: z.number().int().min(0).max(23),
  close_hour: z.number().int().min(1).max(24),
  status: z.enum(["active", "hidden"]),
  created_at: isoDateTime,
  // The person who added it and answers the requests.
  manager: z.string(),
  // Am I allowed to answer the requests (the person who added it, or an admin or moderator of the college)?
  is_manager: z.boolean(),
  // Requests that wait for an answer. Only a manager sees a number, others see 0.
  pending_count: z.number().int().min(0),
});
export const venueResponse = successEnvelope(venueItem);

// VEN-02 POST /api/v1/c/{slug}/venues (IDEM)
export const venueCreateBody = z
  .strictObject({
    name: z.string().trim().min(3).max(80),
    description: z.string().trim().max(600).default(""),
    sports: z.array(z.string().trim().min(2).max(24)).min(1).max(5),
    area: z.string().trim().min(1).max(160).optional(),
    price_inr_per_hour: z.number().int().min(0).max(100000).optional(),
    open_hour: z.number().int().min(0).max(23).default(6),
    close_hour: z.number().int().min(1).max(24).default(23),
  })
  .refine((value) => value.open_hour < value.close_hour, {
    message: "It has to close after it opens.",
    path: ["close_hour"],
  });

// VEN-01 GET /api/v1/c/{slug}/venues?sport=&limit=
export const venueListQuery = z.object({
  sport: z.string().trim().min(2).max(24).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
export const venueListResponse = successEnvelope(z.array(venueItem));

// VEN-04 DELETE /api/v1/c/{slug}/venues/{id}  (hides it)
export const venueHideResponse = successEnvelope(
  z.object({ id: uuid, status: z.literal("hidden") }),
);

// VEN-05 GET /api/v1/c/{slug}/venues/{id}/slots?date=2026-11-20
export const venueSlotsQuery = z.object({ date: day });
export const venueSlot = z.object({
  hour: z.number().int().min(0).max(23),
  // booked: a confirmed request covers this hour. free: it can be asked for.
  state: z.enum(["free", "booked"]),
  // Requests waiting on this hour.
  requests: z.number().int().min(0),
  // Is one of the waiting or confirmed requests mine?
  mine: z.boolean(),
});
export const venueSlotsResponse = successEnvelope(z.array(venueSlot));

export const bookingStatus = z.enum(["pending", "confirmed", "declined", "cancelled"]);
export const bookingItem = z.object({
  id: uuid,
  venue_id: uuid,
  venue_name: z.string(),
  play_date: day,
  start_hour: z.number().int().min(0).max(23),
  hours: z.number().int().min(1).max(4),
  players: z.number().int().nullable(),
  note: z.string(),
  status: bookingStatus,
  manager_note: z.string().nullable(),
  created_at: isoDateTime,
  requester: z.object({ user_id: uuid, display_name: z.string() }),
});
export const bookingResponse = successEnvelope(bookingItem);

// VEN-06 POST /api/v1/c/{slug}/venues/{id}/bookings (IDEM)
export const bookingCreateBody = z.strictObject({
  play_date: day,
  start_hour: z.number().int().min(0).max(23),
  hours: z.number().int().min(1).max(4),
  players: z.number().int().min(1).max(40).optional(),
  note: z.string().trim().max(300).default(""),
});

// VEN-07 GET /api/v1/c/{slug}/venues/{id}/bookings?status=   (a manager)
export const venueBookingsQuery = z.object({
  status: bookingStatus.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
export const bookingListResponse = successEnvelope(z.array(bookingItem));

// VEN-08 GET /api/v1/c/{slug}/me/bookings?limit=
export const myBookingsQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

// VEN-09 POST /api/v1/c/{slug}/bookings/{id}/decision
export const bookingDecisionBody = z.strictObject({
  decision: z.enum(["confirmed", "declined"]),
  note: z.string().trim().max(300).optional(),
});
