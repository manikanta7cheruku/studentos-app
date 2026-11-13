import { z } from "zod";
import { isoDateTime, successEnvelope, uuid } from "./common";

// ---------------------------------------------------------------------------
// Following (FOL-01), invite links (INV-01, INV-02), weekly challenges (CHL-01 to CHL-03) and the contributions shown on a
// profile. Rules: docs/API_CONTRACT.md section 16.
// ---------------------------------------------------------------------------

// What a person gave. Counts only. Anonymous posts never count.
export const contributions = z.object({
  buzz: z.number().int().min(0),
  replies: z.number().int().min(0),
  plans: z.number().int().min(0),
  events: z.number().int().min(0),
  upvotes: z.number().int().min(0),
  challenges: z.number().int().min(0),
  invited: z.number().int().min(0),
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

// CHL-01 GET /api/v1/challenges/current
export const challengeEntry = z.object({
  id: uuid,
  body: z.string(),
  created_at: isoDateTime,
  is_mine: z.boolean(),
  applause: z.number().int().min(0),
  i_applauded: z.boolean(),
  author: z.object({
    user_id: uuid,
    display_name: z.string(),
    avatar_url: z.string().nullable(),
  }),
});
export const challengeCurrent = z.object({
  week_key: z.string(),
  title: z.string(),
  text: z.string(),
  ends_at: isoDateTime,
  entries: z.array(challengeEntry),
  my_entry: challengeEntry.nullable(),
  // How many challenges I have done in all.
  completed: z.number().int().min(0),
});
export const challengeCurrentResponse = successEnvelope(challengeCurrent);

// CHL-02 PUT /api/v1/challenges/current/entry   { "body": "..." }: my answer to this week's challenge (changes it if I already did).
export const challengeEntryBody = z.strictObject({ body: z.string().trim().min(1).max(300) });
export const challengeEntryResponse = successEnvelope(challengeEntry);
// CHL-03 PUT or DELETE /api/v1/challenge-entries/{id}/applause: applaud an answer, or take it back. Not your own.
