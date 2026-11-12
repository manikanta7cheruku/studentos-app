import { z } from "zod";
import { reportReason } from "./engagement";
import { isoDateTime, successEnvelope, uuid } from "./common";

// ---------------------------------------------------------------------------
// Disappearing direct messages (MSG-01 to MSG-04). Rules: docs/API_CONTRACT.md section 19.
// Text only. A message disappears 1 hour after the other person opens it, and 3 days after it was sent if it is never opened.
// ---------------------------------------------------------------------------

const person = z.object({
  user_id: uuid,
  display_name: z.string(),
  avatar_url: z.string().nullable(),
});

// MSG-01 GET /api/v1/c/{slug}/messages: my conversations that still have a message. The words are not in the list.
export const dmThreadItem = person.extend({
  // Messages from them that I have not opened yet.
  unread: z.number().int().min(0),
  last_at: isoDateTime,
});
export const dmThreadListResponse = successEnvelope(z.array(dmThreadItem));

// MSG-02 GET /api/v1/c/{slug}/messages/{userId}: one conversation. Opening it starts the 1 hour clock on their messages.
export const dmMessage = z.object({
  id: uuid,
  mine: z.boolean(),
  body: z.string(),
  created_at: isoDateTime,
  // null until the other person opens it. After that it disappears when `expires_at` comes.
  opened_at: isoDateTime.nullable(),
  expires_at: isoDateTime,
});
export const dmThreadResponse = successEnvelope(
  z.object({
    other: person.nullable(),
    // false when one of us blocked the other.
    can_message: z.boolean(),
    messages: z.array(dmMessage),
  }),
);

// MSG-03 POST /api/v1/c/{slug}/messages/{userId} (IDEM)
export const dmSendBody = z.strictObject({ body: z.string().trim().min(1).max(500) });
export const dmSendResponse = successEnvelope(
  z.object({ id: uuid, created_at: isoDateTime, expires_at: isoDateTime }),
);

// MSG-04 POST /api/v1/c/{slug}/messages/{userId}/report: reports the person. The recent messages are copied into the report.
export const dmReportBody = z.strictObject({
  reason: reportReason,
  details: z.string().trim().max(500).optional(),
});
