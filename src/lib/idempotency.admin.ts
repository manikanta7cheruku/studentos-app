import { idempotencyKey } from "@/contracts";
import { adminClient } from "@/server/admin/supabase-admin";
import { AppError } from "./errors";
import { hashKey } from "./hash";

// Create endpoints marked IDEM in docs/API_CONTRACT.md need an `Idempotency-Key` header (a UUID).
// Same key and same body within 24 hours: the first answer comes back with `Idempotent-Replay: true`.
// Same key at the same moment as an unfinished request: 409 CONFLICT with `Retry-After: 1`.
// Same key with a different body: 422 IDEMPOTENCY_KEY_REUSED. Only successful answers are kept.

export function readIdempotencyKey(request: Request): string {
  const parsed = idempotencyKey.safeParse(request.headers.get("idempotency-key") ?? "");
  if (!parsed.success) {
    throw new AppError("VALIDATION_FAILED", {
      details: {
        fields: [
          { path: "Idempotency-Key", message: "Send an Idempotency-Key header with a UUID." },
        ],
      },
    });
  }
  return parsed.data;
}

export type IdempotentResult = { status: number; data: unknown };

// `keep` lets a route store a smaller answer than it returns. Example: the invite code is shown once
// to the admin and must never be stored, so a replay returns the invite without the code.
//
// The key is CLAIMED before the work starts (database function idem_claim), so two requests with the same key
// at the same moment run the work once: the second gets 409 CONFLICT with Retry-After and can try again.
// If the work fails, the claim is released so the same key can try again. A claim older than 60 seconds
// (a crashed request) is taken over.
type ClaimResult =
  | { outcome: "claimed" }
  | { outcome: "replay"; status_code: number; response: unknown }
  | { outcome: "in_progress" }
  | { outcome: "mismatch" };

export async function withIdempotency(
  input: { userId: string; route: string; key: string; body: unknown },
  run: () => Promise<IdempotentResult>,
  options: { keep?: (data: unknown) => unknown } = {},
): Promise<IdempotentResult & { replay: boolean }> {
  const admin = adminClient();
  const requestHash = hashKey("idempotency", JSON.stringify(input.body));
  const ids = { p_user: input.userId, p_key: input.key, p_route: input.route };

  const { data: claim, error: claimError } = await admin.rpc("idem_claim", {
    ...ids,
    p_hash: requestHash,
  });
  if (claimError) throw new AppError("UPSTREAM_UNAVAILABLE", { cause: claimError });
  const outcome = claim as ClaimResult;

  if (outcome.outcome === "mismatch") throw new AppError("IDEMPOTENCY_KEY_REUSED");
  if (outcome.outcome === "in_progress") {
    throw new AppError("CONFLICT", {
      message: "The same request is still being processed. Try again in a moment.",
      headers: { "Retry-After": "1" },
    });
  }
  if (outcome.outcome === "replay") {
    return { status: outcome.status_code, data: outcome.response, replay: true };
  }

  let result: IdempotentResult;
  try {
    result = await run();
  } catch (error) {
    await admin.rpc("idem_release", ids);
    throw error;
  }

  const { error: completeError } = await admin.rpc("idem_complete", {
    ...ids,
    p_status: result.status,
    p_response: (options.keep ? options.keep(result.data) : result.data) as object,
  });
  if (completeError) {
    // The work already happened. Do not fail the request because the replay record was not saved.
    console.error("idempotency key not saved:", completeError.code);
  }
  return { ...result, replay: false };
}
