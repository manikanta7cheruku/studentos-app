import { z } from "zod";
import { isoDateTime, paginationQuery, successEnvelope, uuid } from "./common";

// ---------------------------------------------------------------------------
// Ideas (IDE-01 to IDE-08): short text posts that students vote on and reply to. Rules: docs/API_CONTRACT.md section 15.
// ---------------------------------------------------------------------------
export const ideaTopic = z.enum(["campus", "study", "sports", "tech", "food", "other"]);

// IDE-01 POST /api/v1/c/{slug}/ideas (IDEM)
export const ideaCreateBody = z.strictObject({
  title: z.string().trim().min(5).max(140),
  body: z.string().trim().max(2000).default(""),
  topic: ideaTopic.default("other"),
});

export const idea = z.object({
  id: uuid,
  title: z.string(),
  body: z.string(),
  topic: ideaTopic,
  // Up votes minus down votes. The author's own up vote counts, so a new idea starts at 1.
  score: z.number().int(),
  comment_count: z.number().int().min(0),
  created_at: isoDateTime,
  is_owner: z.boolean(),
  // My own vote: 1 up, -1 down, 0 none.
  my_vote: z.number().int().min(-1).max(1),
  author: z.object({
    user_id: uuid,
    display_name: z.string(),
    headline: z.string().nullable(),
  }),
});
export const ideaResponse = successEnvelope(idea);

// IDE-02 GET /api/v1/c/{slug}/ideas?sort=new|top&topic=&mine=true&limit=&cursor=
// `new` pages with the cursor. `top` is the best of the last 30 days, one page, no cursor.
export const ideaListQuery = paginationQuery.extend({
  sort: z.enum(["new", "top"]).default("new"),
  topic: ideaTopic.optional(),
  mine: z.enum(["true", "false"]).optional(),
});
export const ideaListResponse = successEnvelope(z.array(idea));

// IDE-04 PUT /api/v1/c/{slug}/ideas/{id}/vote   { "value": 1 | -1 | 0 }
export const ideaVoteBody = z.strictObject({
  value: z.union([z.literal(-1), z.literal(0), z.literal(1)]),
});

// IDE-05 DELETE /api/v1/c/{slug}/ideas/{id}
export const ideaDeleteResponse = successEnvelope(z.object({ deleted: z.literal(true) }));

// IDE-06 POST /api/v1/c/{slug}/ideas/{id}/comments (IDEM). A reply names a top level comment as its parent.
export const ideaCommentCreateBody = z.strictObject({
  body: z.string().trim().min(1).max(800),
  parent_id: uuid.nullable().optional(),
});
export const ideaComment = z.object({
  id: uuid,
  parent_id: uuid.nullable(),
  body: z.string(),
  created_at: isoDateTime,
  is_owner: z.boolean(),
  author: z.object({ user_id: uuid, display_name: z.string() }),
});
export const ideaCommentResponse = successEnvelope(ideaComment);
// IDE-07 GET /api/v1/c/{slug}/ideas/{id}/comments: oldest first, all of them in one answer.
export const ideaCommentListResponse = successEnvelope(z.array(ideaComment));
