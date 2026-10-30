import { createHmac, timingSafeEqual } from "node:crypto";
import { serverEnv } from "./env";

// HMAC-SHA256 with the server secret. Used for rate limit keys and enrolment numbers,
// so the database never holds a plain email, IP address or enrolment number there.
export function hashKey(kind: string, value: string): string {
  return createHmac("sha256", serverEnv().APP_HASH_SECRET).update(`${kind}:${value}`).digest("hex");
}

export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
