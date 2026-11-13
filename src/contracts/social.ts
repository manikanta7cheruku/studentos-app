import { z } from "zod";
import { isoDateTime, successEnvelope, uuid } from "./common";

// ---------------------------------------------------------------------------
// Following (FOL-01, FOL-02), invite links (INV-01, INV-02) and the contributions shown on a profile. Rules: docs/API_CONTRACT.md section 16.
// ---------------------------------------------------------------------------

// What a person gave. Counts only. Anonymous posts never count.
export const contributions = z.object({
  buzz: z.number().int().min(0),
  replies: z.number().int().min(0),
  plans: z.number().int().min(0),
  events: z.number().int().min(0),
  upvotes: z.number().int().min(0),
  // Debates started, plus arguments made (never anonymous ones).
  debates: z.number().int().min(0),
  invited: z.number().int().min(0),
  // The hard-to-fake things the level and badges are built from.
  crowd_debates: z.number().int().min(0).default(0),
  filled_plans: z.number().int().min(0).default(0),
  big_events: z.number().int().min(0).default(0),
  member_days: z.number().int().min(0).default(0),
});

// FOL-01 PUT or DELETE /api/v1/me/follows/{userId}: follow, or stop following. One way, no approval. Safe to repeat.
export const followInfo = z.object({
  followers: z.number().int().min(0),
  following: z.number().int().min(0),
  i_follow: z.boolean(),
});
export const followResponse = successEnvelope(followInfo);

// INV-01 GET /api/v1/me/invite: my invite code and how many people joined through it.
export const inviteInfo = z.object({ code: z.string(), invited: z.number().int().min(0) });
export const inviteResponse = successEnvelope(inviteInfo);

// INV-02 POST /api/v1/me/referral   { "code": "ab12cd34" }: records that I joined through someone's link. Once only.
export const referralBody = z.strictObject({ code: z.string().trim().min(4).max(20) });
export const referralResponse = successEnvelope(z.object({ applied: z.boolean() }));

// FOL-02 GET /api/v1/me/connections?kind=followers|following: the people who follow me, or whom I follow. Only my own lists:
// nobody else can see who follows whom.
export const connectionKind = z.enum(["followers", "following"]);
export const connectionsQuery = z.strictObject({ kind: connectionKind.default("followers") });
export const connection = z.object({
  user_id: uuid,
  display_name: z.string(),
  headline: z.string().nullable(),
  avatar_url: z.string().nullable(),
  since: isoDateTime,
});
export const connectionsResponse = successEnvelope(z.array(connection));

// COL-02 GET /api/v1/colleges/suggest?q=: college names that already exist (the colleges on the platform, then what other people
// typed), to pick from while typing. At most 8. Needs 2 letters.
export const collegeSuggestQuery = z.strictObject({ q: z.string().trim().min(2).max(60) });
export const collegeSuggestResponse = successEnvelope(z.array(z.string()));
