import { beforeEach, describe, expect, it } from "vitest";
import { resetServerEnvForTests } from "@/lib/env";
import { verifyPin } from "@/modules/owner/owner-pin";
import { UNLOCK_MINUTES, isUnlocked, makeUnlock } from "@/modules/owner/owner-session";
import { hashPin, pinProblem } from "../../scripts/owner-pin-lib.mjs";

beforeEach(() => {
  Object.assign(process.env, {
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "a".repeat(30),
    SUPABASE_SERVICE_ROLE_KEY: "b".repeat(30),
    APP_HASH_SECRET: "c".repeat(40),
  });
  resetServerEnvForTests();
});

describe("the owner PIN", () => {
  it("rejects weak PINs", () => {
    expect(pinProblem("short")).toMatch(/at least 12/);
    expect(pinProblem("aaaaaaaaaaaaaaaa")).toMatch(/different/);
    expect(pinProblem("123456789012")).toMatch(/digits/);
    expect(pinProblem("correct horse battery")).toBeNull();
  });

  it("is checked against the hash the script makes, and only that PIN passes", async () => {
    const stored = await hashPin("correct horse battery");
    expect(stored.startsWith("scrypt$")).toBe(true);
    expect(stored).not.toContain("correct horse");
    expect(await verifyPin("correct horse battery", stored)).toBe(true);
    expect(await verifyPin("correct horse batterY", stored)).toBe(false);
    expect(await verifyPin("", stored)).toBe(false);
  });

  it("makes a different hash every time (a fresh salt)", async () => {
    expect(await hashPin("correct horse battery")).not.toBe(await hashPin("correct horse battery"));
  });

  it("refuses a malformed or expensive hash without working on it", async () => {
    expect(await verifyPin("x", "plain-text")).toBe(false);
    expect(await verifyPin("x", "scrypt$1$1$1$AAAA")).toBe(false);
    expect(await verifyPin("x", "scrypt$99999999$8$1$AAAA$AAAA")).toBe(false);
    expect(await verifyPin("x", "scrypt$16384$8$1$AAAA$")).toBe(false);
  });
});

describe("the owner unlock cookie", () => {
  const user = "11111111-1111-4111-8111-111111111111";
  const now = 1_700_000_000_000;

  it("opens for the same account until it expires", () => {
    const value = makeUnlock(user, now);
    expect(isUnlocked(value, user, now + 1_000)).toBe(true);
    expect(isUnlocked(value, user, now + UNLOCK_MINUTES * 60_000 - 1)).toBe(true);
    expect(isUnlocked(value, user, now + UNLOCK_MINUTES * 60_000 + 1)).toBe(false);
  });

  it("does not open for another account", () => {
    expect(isUnlocked(makeUnlock(user, now), "22222222-2222-4222-8222-222222222222", now)).toBe(
      false,
    );
  });

  it("does not open when the value is changed, missing or invented", () => {
    const value = makeUnlock(user, now);
    const [body, signature] = value.split(".") as [string, string];
    const bigger = Buffer.from(
      JSON.stringify({ u: user, e: now + 10 * 365 * 86_400_000 }),
      "utf8",
    ).toString("base64url");
    expect(isUnlocked(`${bigger}.${signature}`, user, now)).toBe(false);
    expect(isUnlocked(`${body}.AAAA`, user, now)).toBe(false);
    expect(isUnlocked(undefined, user, now)).toBe(false);
    expect(isUnlocked("", user, now)).toBe(false);
    expect(isUnlocked("nonsense", user, now)).toBe(false);
  });

  it("stops working when the app secret changes", () => {
    const value = makeUnlock(user, now);
    process.env.APP_HASH_SECRET = "d".repeat(40);
    resetServerEnvForTests();
    expect(isUnlocked(value, user, now)).toBe(false);
  });
});
