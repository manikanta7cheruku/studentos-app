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
// How a conversation stands: a normal chat, a request I received (waiting for me), a request I sent (waiting for them), one they
// were not interested in, or one that ran out after 3 days.
export const dmKind = z.enum(["chat", "request_received", "request_sent", "declined", "expired"]);
export const dmThreadItem = person.extend({
  // Messages from them that I have not opened yet.
  unread: z.number().int().min(0),
  last_at: isoDateTime,
  kind: dmKind.default("chat"),
  // How many messages are still there. A chat stays in the list at 0 once its messages have disappeared.
  message_count: z.number().int().min(0).default(0),
  // When a request runs out, and (after "not interested") when the sender may ask again.
  expires_at: isoDateTime.nullable().default(null),
  can_request_again_at: isoDateTime.nullable().default(null),
});
export const dmThreadListResponse = successEnvelope(z.array(dmThreadItem));

// How long a message stays after the other person opens it: 1 hour, 7 hours or 24 hours (in minutes). 1 hour is the default.
export const disappearMinutes = z.union([z.literal(60), z.literal(420), z.literal(1440)]);
// The timer of a conversation. Either person can change it (when the chat is going, not while it is a request), and it only
// affects messages sent from then on.
export const dmDisappear = z.object({
  minutes: disappearMinutes,
  set_by_me: z.boolean(),
  set_by_name: z.string().nullable(),
  set_at: isoDateTime.nullable(),
  can_change: z.boolean(),
});

// MSG-02 GET /api/v1/c/{slug}/messages/{userId}: one conversation. Opening it starts the clock on their messages.
export const dmMessage = z.object({
  id: uuid,
  mine: z.boolean(),
  body: z.string(),
  created_at: isoDateTime,
  // null until the other person opens it. After that it disappears when `expires_at` comes.
  opened_at: isoDateTime.nullable(),
  expires_at: isoDateTime,
});
// The state of the request in a conversation (null for a normal chat). A request: one message, 3 days to answer.
export const dmRequestState = z.object({
  status: z.enum(["pending", "declined", "expired"]),
  i_requested: z.boolean(),
  expires_at: isoDateTime.nullable(),
  // After "not interested": the day the sender may ask again (5 days later).
  can_request_again_at: isoDateTime.nullable(),
});
export const dmThreadResponse = successEnvelope(
  z.object({
    other: person
      .extend({
        headline: z.string().nullable().default(null),
        college_name: z.string().nullable().default(null),
        branch: z.string().nullable().default(null),
        grad_year: z.number().int().nullable().default(null),
      })
      .nullable(),
    request: dmRequestState.nullable().default(null),
    // The timer of this chat (for a chat that does not exist yet: my default).
    disappear: dmDisappear.default({
      minutes: 60,
      set_by_me: false,
      set_by_name: null,
      set_at: null,
      can_change: false,
    }),
    // false when one of us blocked the other.
    can_message: z.boolean(),
    messages: z.array(dmMessage),
  }),
);

// MSG-03 POST /api/v1/c/{slug}/messages/{userId} (IDEM)
export const dmSendBody = z.strictObject({ body: z.string().trim().min(1).max(500) });
export const dmSendResponse = successEnvelope(
  z.object({
    id: uuid,
    created_at: isoDateTime,
    expires_at: isoDateTime,
    // True when this message started a request (the other person has to accept first).
    request: z.boolean().default(false),
  }),
);

// MSG-04 POST /api/v1/c/{slug}/messages/{userId}/report: reports the person. The recent messages are copied into the report.
export const dmReportBody = z.strictObject({
  reason: reportReason,
  details: z.string().trim().max(500).optional(),
});

// MSG-05 POST /api/v1/c/{slug}/messages/{userId}/decline: "not interested" in a request I received. The sender is told, kindly,
// that I am not available right now. They can ask again after 5 days. 404 when there is no open request from that person.
export const dmDeclineResponse = successEnvelope(z.object({ status: z.literal("declined") }));

// MSG-06 PUT /api/v1/c/{slug}/messages/{userId}/timer   { "minutes": 60 | 420 | 1440 }: change the timer of a chat I am in.
export const dmTimerBody = z.strictObject({ minutes: disappearMinutes });
export const dmTimerResponse = successEnvelope(dmDisappear);

// MSG-07 GET /api/v1/me/message-settings and MSG-08 PUT: what my new conversations start with.
export const messageSettings = z.object({ default_minutes: disappearMinutes });
export const messageSettingsResponse = successEnvelope(messageSettings);
export const messageSettingsBody = z.strictObject({ default_minutes: disappearMinutes });
