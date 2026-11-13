import { createHash, timingSafeEqual } from "node:crypto";
import { ok, route } from "@/lib/api";
import { AppError } from "@/lib/errors";
import { dispatchPending } from "@/modules/push/push.admin";

// SYS-03 POST /api/internal/push. Called by the scheduler every minute or so (not by people), as a safety net:
// alerts are also sent right after a change is saved. Header: Authorization: Bearer <CRON_SECRET>, otherwise 401.
// Answer: { sent, dropped }. Safe to run twice.
const digest = (value: string) => createHash("sha256").update(value).digest();

export const POST = route(async ({ request, requestId }) => {
  const secret = process.env.CRON_SECRET ?? "";
  const sent = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (secret.length < 24 || !timingSafeEqual(digest(sent), digest(secret))) {
    throw new AppError("UNAUTHENTICATED");
  }
  return ok(await dispatchPending({ force: true }), requestId);
});
