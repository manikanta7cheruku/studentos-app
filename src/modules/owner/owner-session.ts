import { createHmac, timingSafeEqual } from "node:crypto";
import { serverEnv } from "@/lib/env";

// The owner "unlock": after the right PIN the browser gets a signed cookie that says "this account entered the PIN until
// this time". The server signs it with the app secret, so it cannot be made or changed in the browser. It is tied to
// one account, lasts UNLOCK_MINUTES in total (it does not stretch with use) and is deleted by Lock.

export const UNLOCK_COOKIE = "owner_unlock";
export const UNLOCK_MINUTES = 30;

type Payload = { u: string; e: number };

const sign = (data: string) =>
  createHmac("sha256", `owner-unlock:${serverEnv().APP_HASH_SECRET}`)
    .update(data)
    .digest("base64url");

export function makeUnlock(userId: string, now: number = Date.now()): string {
  const payload: Payload = { u: userId, e: now + UNLOCK_MINUTES * 60_000 };
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${body}.${sign(body)}`;
}

export function isUnlocked(
  value: string | undefined,
  userId: string,
  now: number = Date.now(),
): boolean {
  if (!value) return false;
  const [body, signature] = value.split(".");
  if (!body || !signature) return false;
  const expected = Buffer.from(sign(body));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return false;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Payload;
    return payload.u === userId && typeof payload.e === "number" && payload.e > now;
  } catch {
    return false;
  }
}
