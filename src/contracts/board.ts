import { z } from "zod";
import { isoDateTime, paginationQuery, successEnvelope, uuid } from "./common";

// ---------------------------------------------------------------------------
// The board (BRD-01 to BRD-07): Lost and found and the Marketplace. Contact is private and in the app (messages).
// Payments are not part of this. Rules: docs/API_CONTRACT.md section 16.
// ---------------------------------------------------------------------------
export const boardName = z.enum(["lostfound", "market"]);
export const boardKind = z.enum(["lost", "found", "sell", "rent", "free", "wanted"]);
export const boardStatus = z.enum(["open", "resolved"]);

const KINDS_OF: Record<z.infer<typeof boardName>, readonly string[]> = {
  lostfound: ["lost", "found"],
  market: ["sell", "rent", "free", "wanted"],
};

// BRD-01 POST /api/v1/c/{slug}/board (IDEM)
export const boardCreateBody = z
  .strictObject({
    board: boardName,
    kind: boardKind,
    title: z.string().trim().min(5).max(120),
    description: z.string().trim().max(1500).default(""),
    place: z.string().trim().min(1).max(120).optional(),
    // Whole rupees. Only the market, and not for a free item.
    price_inr: z.number().int().min(0).max(1_000_000).optional(),
  })
  .refine((body) => KINDS_OF[body.board].includes(body.kind), {
    message: "This kind does not belong to this board",
    path: ["kind"],
  })
  .refine(
    (body) => body.price_inr === undefined || (body.board === "market" && body.kind !== "free"),
    {
      message: "Only items for sale, rent or wanted have a price",
      path: ["price_inr"],
    },
  );

export const boardItem = z.object({
  id: uuid,
  board: boardName,
  kind: boardKind,
  title: z.string(),
  description: z.string(),
  place: z.string().nullable(),
  price_inr: z.number().int().nullable(),
  // A picture of the thing, if the author added one (shrunk on the phone, at most 1 MB).
  photo_url: z.string().nullable().default(null),
  status: boardStatus,
  created_at: isoDateTime,
  is_owner: z.boolean(),
  // How many messages I am part of on this post (so the screen can say "You wrote to them").
  my_message_count: z.number().int().min(0),
  author: z.object({ user_id: uuid, display_name: z.string() }),
});
export const boardResponse = successEnvelope(boardItem);

// BRD-02 GET /api/v1/c/{slug}/board?board=&kind=&status=open|all&mine=true&limit=&cursor=
export const boardListQuery = paginationQuery.extend({
  board: boardName,
  kind: boardKind.optional(),
  status: z.enum(["open", "resolved", "all"]).default("open"),
  mine: z.enum(["true", "false"]).optional(),
});
export const boardListResponse = successEnvelope(z.array(boardItem));

// BRD-04 POST /api/v1/c/{slug}/board/{id}/status   { "status": "resolved" }  (only the author)
export const boardStatusBody = z.strictObject({ status: boardStatus });

// BRD-05 DELETE /api/v1/c/{slug}/board/{id}
export const boardDeleteResponse = successEnvelope(z.object({ deleted: z.literal(true) }));

// BRD-07 POST /api/v1/c/{slug}/board/{id}/messages (IDEM)
// A person writes to the author. The author answers one person with `to_user`, who has written before.
export const boardMessageBody = z.strictObject({
  body: z.string().trim().min(1).max(500),
  to_user: uuid.optional(),
});
export const boardMessage = z.object({
  id: uuid,
  body: z.string(),
  created_at: isoDateTime,
  mine: z.boolean(),
  from: z.object({ user_id: uuid, display_name: z.string() }),
  // The other person of the thread. For the author this says who each thread is with.
  with_user: z.object({ user_id: uuid, display_name: z.string() }),
});
export const boardMessageResponse = successEnvelope(boardMessage);
// BRD-06 GET /api/v1/c/{slug}/board/{id}/messages: the author sees every thread, anyone else only their own.
export const boardMessageListResponse = successEnvelope(z.array(boardMessage));
