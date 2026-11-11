import { z } from "zod";
import { isoDateTime, successEnvelope, uuid } from "./common";

// ---------------------------------------------------------------------------
// Removing content with a reason (ADM-13, ADM-14). The author is told why. Rules: docs/API_CONTRACT.md section 17.
// ---------------------------------------------------------------------------
export const contentKind = z.enum(["plan", "thought", "event", "listing"]);
export const removalReason = z.enum([
  "spam",
  "inappropriate",
  "harassment",
  "scam",
  "duplicate",
  "other",
]);

// ADM-13 POST /api/v1/c/{slug}/admin/content/remove
export const contentRemoveBody = z.strictObject({
  kind: contentKind,
  id: uuid,
  reason: removalReason,
  // Shown to the author with the reason. Up to 300 characters.
  note: z.string().trim().max(300).optional(),
});
export const contentRemoveResponse = successEnvelope(z.object({ removed: z.literal(true) }));

// ADM-14 GET /api/v1/c/{slug}/admin/content?limit=
export const contentItem = z.object({
  kind: contentKind,
  id: uuid,
  title: z.string(),
  author: z.string(),
  status: z.string(),
  created_at: isoDateTime,
});
export const contentListQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
export const contentListResponse = successEnvelope(z.array(contentItem));
