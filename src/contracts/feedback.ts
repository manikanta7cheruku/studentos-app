import { z } from "zod";
import { isoDateTime, successEnvelope, uuid } from "./common";

// FDB-01 POST /api/v1/me/feedback: a short note to the team. Rules: docs/API_CONTRACT.md section 19.
export const feedbackKind = z.enum(["idea", "problem", "other"]);
export const feedbackCreateBody = z.strictObject({
  kind: feedbackKind.default("idea"),
  message: z.string().trim().min(5).max(1500),
  // The address of the screen the person was on (a path, for example /c/alpha/turf).
  page: z.string().trim().max(200).optional(),
});
export const feedbackCreateResponse = successEnvelope(
  z.object({ id: uuid, created_at: isoDateTime }),
);
