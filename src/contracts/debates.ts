import { z } from "zod";
import { isoDateTime, paginationQuery, successEnvelope, uuid } from "./common";

// ---------------------------------------------------------------------------
// Debates (DEB-01 to DEB-09): a question with two sides and an end time. People pick a side, post arguments under it and
// upvote the strong ones. It closes by itself when the time is up. Rules: docs/API_CONTRACT.md section 16.
// ---------------------------------------------------------------------------
export const debateTopic = z.enum([
  "movies",
  "sports",
  "tech",
  "campus",
  "politics",
  "music",
  "food",
  "other",
]);
// How long it runs, in hours: 1, 6, 24 (a day), 72 (3 days) or 168 (a week).
export const debateHours = z.union([
  z.literal(1),
  z.literal(6),
  z.literal(24),
  z.literal(72),
  z.literal(168),
]);

// DEB-01 POST /api/v1/c/{slug}/debates (IDEM). 429 at 3 debates a day.
export const debateCreateBody = z
  .strictObject({
    title: z.string().trim().min(5).max(140),
    body: z.string().trim().max(600).default(""),
    topic: debateTopic.default("other"),
    side_a: z.string().trim().min(1).max(30),
    side_b: z.string().trim().min(1).max(30),
    hours: debateHours,
  })
  .refine((value) => value.side_a.toLowerCase() !== value.side_b.toLowerCase(), {
    message: "The two sides must be different",
    path: ["side_b"],
  });

export const debate = z.object({
  id: uuid,
  title: z.string(),
  body: z.string(),
  topic: debateTopic,
  side_a: z.string(),
  side_b: z.string(),
  created_at: isoDateTime,
  ends_at: isoDateTime,
  // True once the end time has passed. The debate then takes no more sides, arguments or votes.
  ended: z.boolean(),
  // How many people chose each side. The winner of an ended debate is the side with more people (equal is a tie).
  a_count: z.number().int().min(0),
  b_count: z.number().int().min(0),
  // The side I chose: 0 (A), 1 (B), or null when I have not joined.
  my_side: z.number().int().min(0).max(1).nullable(),
  argument_count: z.number().int().min(0),
  is_owner: z.boolean(),
  author: z.object({ user_id: uuid, display_name: z.string() }),
});
export const debateResponse = successEnvelope(debate);

// DEB-02 GET /api/v1/c/{slug}/debates?status=live|ended|all&topic=&limit=&cursor=: newest first.
export const debateListQuery = paginationQuery.extend({
  status: z.enum(["live", "ended", "all"]).default("live"),
  topic: debateTopic.optional(),
});
export const debateListResponse = successEnvelope(z.array(debate));

// DEB-04 PUT /api/v1/c/{slug}/debates/{id}/side   { "side": 0 | 1 }: join a side, or change it. 409 after the end.
export const debateSideBody = z.strictObject({ side: z.union([z.literal(0), z.literal(1)]) });

// DEB-05 POST /api/v1/c/{slug}/debates/{id}/arguments (IDEM): an argument under my side. 400 when I have not chosen a side,
// 409 after the end, 429 at 30 an hour. `anonymous` hides my name (others see "Anonymous <animal>").
export const debateArgumentCreateBody = z.strictObject({
  body: z.string().trim().min(1).max(600),
  anonymous: z.boolean().default(false),
});
export const debateArgument = z.object({
  id: uuid,
  side: z.number().int().min(0).max(1),
  body: z.string(),
  created_at: isoDateTime,
  is_owner: z.boolean(),
  // "Strong point" upvotes, and whether I gave one.
  score: z.number().int().min(0),
  i_upvoted: z.boolean(),
  is_anonymous: z.boolean(),
  by_debate_author: z.boolean(),
  author: z.object({ user_id: uuid, display_name: z.string() }),
});
export const debateArgumentResponse = successEnvelope(debateArgument);
// DEB-06 GET /api/v1/c/{slug}/debates/{id}/arguments: the strongest first, all in one answer.
export const debateArgumentListResponse = successEnvelope(z.array(debateArgument));

// DEB-07 PUT /api/v1/c/{slug}/debates/{id}/arguments/{argumentId}/vote   { "value": 1 | 0 }: a strong point, or take it back.
// Not your own (400). 409 after the end.
export const debateArgumentVoteBody = z.strictObject({
  value: z.union([z.literal(0), z.literal(1)]),
});

// DEB-08 DELETE /api/v1/c/{slug}/debates/{id} and DEB-09 DELETE .../arguments/{argumentId}: the author, or a moderator or admin.
export const debateDeleteResponse = successEnvelope(z.object({ deleted: z.literal(true) }));
