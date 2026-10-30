import { adminClient } from "@/server/admin/supabase-admin";
import { AppError, rateLimited } from "@/lib/errors";

// Thin wrappers around the rate_limit_* SQL functions (supabase/migrations/..._rate_limits_*.sql).
// Keys are HMAC hashes made by the caller. They are never a plain email or IP address.

async function call<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await adminClient().rpc(fn, args);
  if (error) throw new AppError("UPSTREAM_UNAVAILABLE", { cause: error });
  return data as T;
}

// Count one event, or throw RATE_LIMITED (429 with Retry-After) when the limit is reached.
export async function consumeOrThrow(
  bucket: string,
  keyHash: string,
  limit: number,
  windowSeconds: number,
): Promise<void> {
  const wait = await call<number>("rate_limit_consume", {
    p_bucket: bucket,
    p_key_hash: keyHash,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (wait > 0) throw rateLimited(wait);
}

// Throw RATE_LIMITED if the limit is already reached. Does not count.
export async function assertNotBlocked(
  bucket: string,
  keyHash: string,
  limit: number,
  windowSeconds: number,
): Promise<void> {
  const wait = await call<number>("rate_limit_peek", {
    p_bucket: bucket,
    p_key_hash: keyHash,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (wait > 0) throw rateLimited(wait);
}

export async function record(bucket: string, keyHash: string): Promise<void> {
  await call<null>("rate_limit_record", { p_bucket: bucket, p_key_hash: keyHash });
}

export async function clear(bucket: string, keyHash: string): Promise<void> {
  await call<null>("rate_limit_clear", { p_bucket: bucket, p_key_hash: keyHash });
}

export async function lastEventAt(bucket: string, keyHash: string): Promise<Date | null> {
  const value = await call<string | null>("rate_limit_last", {
    p_bucket: bucket,
    p_key_hash: keyHash,
  });
  return value ? new Date(value) : null;
}
