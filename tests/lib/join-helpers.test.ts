import { beforeEach, describe, expect, it } from "vitest";
import { resetServerEnvForTests } from "@/lib/env";
import { hashEnrollment, hashInviteCode, normaliseEnrollment } from "@/modules/tenancy/join.admin";

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

describe("invite code hash", () => {
  it("ignores case and spaces around the code, and never contains the code", () => {
    expect(hashInviteCode(" alpha-7k3q-9xpd ")).toBe(hashInviteCode("ALPHA-7K3Q-9XPD"));
    expect(hashInviteCode("ALPHA-7K3Q-9XPD")).not.toContain("7K3Q");
    expect(hashInviteCode("ALPHA-7K3Q-9XPD")).not.toBe(hashInviteCode("ALPHA-7K3Q-9XPE"));
  });
});

describe("enrolment number", () => {
  it("is normalised: no spaces or dashes, upper case", () => {
    expect(normaliseEnrollment(" 21ab-1a 0501 ")).toBe("21AB1A0501");
  });

  it("hashes the same for the same college and number, differently for another college", () => {
    expect(hashEnrollment("alpha", "21ab1a0501")).toBe(hashEnrollment("alpha", " 21AB-1A0501 "));
    expect(hashEnrollment("alpha", "21AB1A0501")).not.toBe(hashEnrollment("beta", "21AB1A0501"));
    expect(hashEnrollment("alpha", "21AB1A0501")).not.toContain("21AB1A0501");
  });
});
