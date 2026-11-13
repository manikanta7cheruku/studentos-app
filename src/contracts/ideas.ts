import { z } from "zod";
import { isoDateTime, paginationQuery, successEnvelope, uuid } from "./common";

// ---------------------------------------------------------------------------
// Ideas (IDE-01 to IDE-08): short text posts that students vote on and reply to. Rules: docs/API_CONTRACT.md section 15.
// ---------------------------------------------------------------------------
export const ideaTopic = z.enum(["campus", "study", "sports", "tech", "food", "other"]);

// IDE-01 POST /api/v1/c/{slug}/ideas (IDEM)
// A thought needs only some text: a title, a body, or both. The topic is optional.
export const ideaCreateBody = z
  .strictObject({
    title: z.string().trim().max(140).default(""),
    body: z.string().trim().max(2000).default(""),
    topic: ideaTopic.default("other"),
    // Post without my name. Other people see "Anonymous fox". Moderators can still tell who it was.
    anonymous: z.boolean().default(false),
    // A poll: two to four short options.
    poll: z.array(z.string().trim().min(1).max(40)).min(2).max(4).optional(),
  })
  .refine((value) => value.title.length + value.body.length > 0, {
    message: "Write something",
    path: ["body"],
  });

export const ideaPoll = z.object({
  options: z.array(z.object({ text: z.string(), votes: z.number().int().min(0) })),
  // The option I picked (0 to 3), or null when I have not voted.
  my_option: z.number().int().min(0).max(3).nullable(),
  total: z.number().int().min(0),
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
  // Posted without a name: the author is then "Anonymous <animal>" with a nil user id.
  is_anonymous: z.boolean().default(false),
  poll: ideaPoll.nullable().default(null),
  author: z.object({
    user_id: uuid,
    display_name: z.string(),
    headline: z.string().nullable(),
  }),
});
// IDE-10 POST /api/v1/c/{slug}/ideas/{id}/poll   { "option": 0 }: pick an option (picking again changes it). Answers with the idea.
export const ideaPollVoteBody = z.strictObject({ option: z.number().int().min(0).max(3) });
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
  anonymous: z.boolean().default(false),
});
export const ideaComment = z.object({
  id: uuid,
  parent_id: uuid.nullable(),
  body: z.string(),
  created_at: isoDateTime,
  is_owner: z.boolean(),
  // Likes minus dislikes, and my own vote (1, -1 or 0).
  score: z.number().int().default(0),
  my_vote: z.number().int().min(-1).max(1).default(0),
  is_anonymous: z.boolean().default(false),
  // True when the comment is by the author of the buzz (also when both are anonymous).
  by_buzz_author: z.boolean().default(false),
  author: z.object({ user_id: uuid, display_name: z.string() }),
});
export const ideaCommentResponse = successEnvelope(ideaComment);
// IDE-07 GET /api/v1/c/{slug}/ideas/{id}/comments: oldest first, all of them in one answer.
export const ideaCommentListResponse = successEnvelope(z.array(ideaComment));
