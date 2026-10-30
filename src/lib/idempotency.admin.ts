import { idempotencyKey } from "@/contracts";
import { adminClient } from "@/server/admin/supabase-admin";
import { AppError } from "./errors";
import { hashKey } from "./hash";

// Create endpoints marked IDEM in docs/API_CONTRACT.md need an `Idempotency-Key` header (a UUID).
// Same key and same body within 24 hours: the first answer comes back with `Idempotent-Replay: true`.
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

export async function withIdempotency(
  input: { userId: string; route: string; key: string; body: unknown },
  run: () => Promise<IdempotentResult>,
): Promise<IdempotentResult & { replay: boolean }> {
  const admin = adminClient();
  const requestHash = hashKey("idempotency", JSON.stringify(input.body));

  const { data: existing, error: readError } = await admin
    .from("idempotency_keys")
    .select("request_hash, response, status_code, expires_at")
    .eq("user_id", input.userId)
    .eq("key", input.key)
    .eq("route", input.route)
    .maybeSingle();
  if (readError) throw new AppError("UPSTREAM_UNAVAILABLE", { cause: readError });

  if (existing && new Date(existing.expires_at).getTime() > Date.now()) {
    if (existing.request_hash !== requestHash) throw new AppError("IDEMPOTENCY_KEY_REUSED");
    return { status: existing.status_code, data: existing.response, replay: true };
  }

  const result = await run();

  const row = {
    user_id: input.userId,
    key: input.key,
    route: input.route,
    request_hash: requestHash,
    response: result.data as object,
    status_code: result.status,
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };
  const { error: writeError } = await admin
    .from("idempotency_keys")
    .upsert(row, { onConflict: "user_id,key,route" });
  if (writeError) {
    // The join already happened. Do not fail the request because the replay record was not saved.
    console.error("idempotency key not saved:", writeError.code);
  }
  return { ...result, replay: false };
}
