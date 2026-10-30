import type { SupabaseClient, User } from "@supabase/supabase-js";
import { AppError, rateLimited } from "@/lib/errors";
import { hashKey } from "@/lib/hash";
import { createAnonClient } from "@/lib/supabase/request-client";
import {
  assertNotBlocked,
  clear,
  consumeOrThrow,
  lastEventAt,
  record,
} from "@/modules/rate-limit/rate-limit.admin";

// Limits from docs/API_CONTRACT.md section 1 and docs/ERROR_HANDLING.md F27.
export const OTP_LIMITS = {
  requestPerEmail: { limit: 5, windowSeconds: 3600 },
  requestPerIp: { limit: 20, windowSeconds: 3600 },
  verifyAttemptsPerEmail: { limit: 10, windowSeconds: 900 },
  wrongCodesBeforeLock: { limit: 5, windowSeconds: 900 },
} as const;

// Must match [auth.email] otp_expiry in supabase/config.toml and the hosted project setting.
export const OTP_EXPIRY_SECONDS = 600;
export const RETRY_AFTER_SECONDS = 60;

const emailKey = (email: string) => hashKey("email", email);

// AUTH-01. The answer is the same for every address, so nobody can test which emails have accounts.
export async function requestOtp(input: { email: string; ip: string }): Promise<{
  sent: true;
  retry_after_seconds: number;
}> {
  const key = emailKey(input.email);
  await consumeOrThrow(
    "otp_request_ip",
    hashKey("ip", input.ip),
    OTP_LIMITS.requestPerIp.limit,
    OTP_LIMITS.requestPerIp.windowSeconds,
  );
  await consumeOrThrow(
    "otp_request_email",
    key,
    OTP_LIMITS.requestPerEmail.limit,
    OTP_LIMITS.requestPerEmail.windowSeconds,
  );

  const { error } = await createAnonClient().auth.signInWithOtp({
    email: input.email,
    options: { shouldCreateUser: true },
  });
  if (error) {
    // The mail service refuses to send two codes to one address too quickly (429).
    if (error.status === 429 || error.code === "over_email_send_rate_limit") {
      throw rateLimited(RETRY_AFTER_SECONDS);
    }
    // Any other provider problem looks the same to the caller (F3). Details stay in the log.
    throw new AppError("UPSTREAM_UNAVAILABLE", {
      message: "We're having trouble sending codes. Try again in a few minutes.",
      cause: { status: error.status, code: error.code },
    });
  }
  await record("otp_sent", key);
  return { sent: true, retry_after_seconds: RETRY_AFTER_SECONDS };
}

// Supabase answers "expired or invalid" for both mistakes. We tell them apart with our own record:
// no code sent in the last OTP_EXPIRY_SECONDS means the code the person has is too old.
async function classifyWrongCode(key: string): Promise<AppError> {
  const sentAt = await lastEventAt("otp_sent", key);
  const expired = !sentAt || Date.now() - sentAt.getTime() > OTP_EXPIRY_SECONDS * 1000;
  return new AppError(expired ? "OTP_EXPIRED" : "OTP_INVALID");
}

// Checks a code for an address: limits, the check itself, and the right error code. Used by sign in
// (AUTH-02) and by the college email proof (TEN-05). `supabase` decides where a session would be kept.
export async function checkCode(
  supabase: SupabaseClient,
  input: { email: string; code: string },
): Promise<User> {
  const key = emailKey(input.email);
  await assertNotBlocked(
    "otp_verify_fail",
    key,
    OTP_LIMITS.wrongCodesBeforeLock.limit,
    OTP_LIMITS.wrongCodesBeforeLock.windowSeconds,
  );
  await consumeOrThrow(
    "otp_verify_attempt",
    key,
    OTP_LIMITS.verifyAttemptsPerEmail.limit,
    OTP_LIMITS.verifyAttemptsPerEmail.windowSeconds,
  );

  const { data, error } = await supabase.auth.verifyOtp({
    email: input.email,
    token: input.code,
    type: "email",
  });

  if (error || !data.user) {
    if (error && (error.status ?? 0) >= 500) {
      throw new AppError("UPSTREAM_UNAVAILABLE", {
        cause: { status: error.status, code: error.code },
      });
    }
    await record("otp_verify_fail", key);
    throw await classifyWrongCode(key);
  }

  await clear("otp_verify_fail", key);
  return data.user;
}

// AUTH-02. `supabase` must be the cookie-backed client, so the session cookies are set on success.
export async function verifyOtp(
  supabase: SupabaseClient,
  input: { email: string; code: string },
): Promise<{ user: { id: string; email: string }; is_new: boolean }> {
  const user = await checkCode(supabase, input);
  const is_new = await ensureProfile(supabase, user.id, input.email);
  return { user: { id: user.id, email: user.email ?? input.email }, is_new };
}

// First sign in creates the profile (docs/AUTH_AND_TENANCY.md section 2). The display name starts
// as the part of the email before the @, and the person can change it later.
async function ensureProfile(
  supabase: SupabaseClient,
  userId: string,
  email: string,
): Promise<boolean> {
  const { data: existing, error: readError } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (readError) throw new AppError("UPSTREAM_UNAVAILABLE", { cause: readError });
  if (existing) return false;

  const name = (email.split("@")[0] ?? "").trim().slice(0, 80) || "Student";
  const { error: insertError } = await supabase
    .from("profiles")
    .insert({ user_id: userId, display_name: name });
  if (insertError && insertError.code !== "23505") {
    throw new AppError("UPSTREAM_UNAVAILABLE", { cause: insertError });
  }
  return !insertError;
}
