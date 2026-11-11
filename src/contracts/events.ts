import { z } from "zod";
import { isoDateTime, successEnvelope, uuid } from "./common";

// ---------------------------------------------------------------------------
// Events (EVT-01 to EVT-05): a start time, a place, an optional capacity, and RSVPs. Rules: docs/API_CONTRACT.md section 16.
// ---------------------------------------------------------------------------

// EVT-01 POST /api/v1/c/{slug}/events (IDEM)
export const eventCreateBody = z.strictObject({
  title: z.string().trim().min(5).max(120),
  description: z.string().trim().max(2000).default(""),
  // In the future, within a year.
  starts_at: isoDateTime,
  place: z.string().trim().min(1).max(120).optional(),
  capacity: z.number().int().min(1).max(5000).optional(),
  // Only reachable by its link, by the host and by people who said they go.
  invite_only: z.boolean().optional(),
});

export const eventItem = z.object({
  id: uuid,
  title: z.string(),
  description: z.string(),
  starts_at: isoDateTime,
  place: z.string().nullable(),
  capacity: z.number().int().nullable(),
  status: z.enum(["published", "cancelled", "removed"]),
  // official: made by a college admin or moderator inside a college. personal: made by a student in Global.
  kind: z.enum(["official", "personal"]).default("official"),
  invite_only: z.boolean().default(false),
  going_count: z.number().int().min(0),
  // Am I going? The author goes by default.
  going: z.boolean(),
  is_owner: z.boolean(),
  created_at: isoDateTime,
  author: z.object({ user_id: uuid, display_name: z.string() }),
});
export const eventResponse = successEnvelope(eventItem);

// EVT-02 GET /api/v1/c/{slug}/events?when=upcoming|past&mine=true&limit=
// `upcoming` is soonest first and includes events that started less than 3 hours ago. One page, at most 100.
export const eventListQuery = z.object({
  when: z.enum(["upcoming", "past"]).default("upcoming"),
  mine: z.enum(["true", "false"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
export const eventListResponse = successEnvelope(z.array(eventItem));

// EVT-04 PUT /api/v1/c/{slug}/events/{id}/rsvp   { "going": true | false }
export const eventRsvpBody = z.strictObject({ going: z.boolean() });
