import { createHash, timingSafeEqual } from "node:crypto";
import { ok, route } from "@/lib/api";
import { AppError } from "@/lib/errors";
import { runMaintenance } from "@/modules/maintenance/maintenance.admin";

// SYS-02 POST /api/internal/maintenance. Called by a scheduler about once an hour (not by people).
// Header: Authorization: Bearer <CRON_SECRET>. Without a matching secret, or when CRON_SECRET is not set: 401.
// What it does: expires team posts past their deadline, expires join requests nobody decided in 30 days,
// tells the people, and deletes old rows (idempotency keys, rate limit events, notifications, waitlist).
// Safe to run twice. Answer: the counts. See docs/OBSERVABILITY.md for how to schedule it.
const digest = (value: string) => createHash("sha256").update(value).digest();

export const POST = route(async ({ request, requestId }) => {
  const secret = process.env.CRON_SECRET ?? "";
  const sent = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (secret.length < 24 || !timingSafeEqual(digest(sent), digest(secret))) {
    throw new AppError("UNAUTHENTICATED");
  }
  return ok(await runMaintenance(), requestId);
});
