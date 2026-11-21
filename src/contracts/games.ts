import { z } from "zod";
import { isoDateTime, successEnvelope, uuid } from "./common";

// ---------------------------------------------------------------------------
// Games at a turf or court (GAM-01 to GAM-07): a student sets up a game (sport, venue, day and time, how many players, what each
// pays), others join, ask, wait for a place, or say they cannot make it. Nobody pays in the app. Rules: docs/API_CONTRACT.md
// section 18.
// ---------------------------------------------------------------------------

export const gameJoinMode = z.enum(["open", "approval"]);
// joined: in. requested: waiting for the host. waitlist: the game was full, waiting for a place.
export const gameMyStatus = z.enum(["joined", "requested", "waitlist"]);

export const gameItem = z.object({
  id: uuid,
  sport: z.string(),
  venue: z.string(),
  area: z.string().nullable(),
  starts_at: isoDateTime,
  hours: z.number().int().min(1).max(6),
  // All the players wanted, the host included.
  capacity: z.number().int().min(2).max(40),
  // Whole rupees each person pays. Shown only. null or 0 is free.
  price_inr: z.number().int().nullable(),
  join_mode: gameJoinMode,
  note: z.string(),
  status: z.enum(["open", "cancelled"]),
  created_at: isoDateTime,
  is_host: z.boolean(),
  host: z.object({ user_id: uuid, display_name: z.string() }),
  joined_count: z.number().int().min(0),
  waitlist_count: z.number().int().min(0),
  // Only the host sees a number here, others see 0.
  requested_count: z.number().int().min(0),
  my_status: gameMyStatus.nullable(),
  // My place on the waiting list (1 is next), when I am on it.
  my_place: z.number().int().min(1).nullable(),
  // The players who are in. Filled on one game, empty in the list.
  players: z
    .array(z.object({ user_id: uuid, display_name: z.string(), is_host: z.boolean() }))
    .default([]),
  // Requests and the waiting list, for the host only.
  requests: z
    .array(
      z.object({
        user_id: uuid,
        display_name: z.string(),
        status: z.enum(["requested", "waitlist"]),
        since: isoDateTime,
      }),
    )
    .default([]),
});
export const gameResponse = successEnvelope(gameItem);

// GAM-01 GET /api/v1/c/{slug}/games?sport=&mine=true&limit=
export const gameListQuery = z.object({
  sport: z.string().trim().min(2).max(24).optional(),
  mine: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => value === "true"),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
export const gameListResponse = successEnvelope(z.array(gameItem));

// GAM-02 POST /api/v1/c/{slug}/games (IDEM)
export const gameCreateBody = z.strictObject({
  sport: z.string().trim().min(2).max(24),
  venue: z.string().trim().min(3).max(80),
  area: z.string().trim().min(1).max(120).optional(),
  starts_at: isoDateTime,
  hours: z.number().int().min(1).max(6).default(1),
  capacity: z.number().int().min(2).max(40),
  price_inr: z.number().int().min(0).max(100000).optional(),
  join_mode: gameJoinMode.default("open"),
  note: z.string().trim().max(300).default(""),
});

// GAM-06 POST /api/v1/c/{slug}/games/{id}/decision
export const gameDecisionBody = z.strictObject({
  user_id: uuid,
  decision: z.enum(["accepted", "declined", "removed"]),
});
