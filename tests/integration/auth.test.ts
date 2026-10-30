import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  errorEnvelope,
  logoutResponse,
  myMembershipResponse,
  otpRequestResponse,
  otpVerifyResponse,
} from "@/contracts";
import { POST as logout } from "@/app/api/v1/auth/logout/route";
import { POST as otpRequest } from "@/app/api/v1/auth/otp/request/route";
import { POST as otpVerify } from "@/app/api/v1/auth/otp/verify/route";
import { GET as myMembership } from "@/app/api/v1/c/[slug]/me/membership/route";
import { adminClient } from "@/server/admin/supabase-admin";
import { hashKey } from "@/lib/hash";
import { requireMember } from "@/modules/tenancy/require-member";
import { CookieJar } from "@/lib/supabase/request-client";
import { AppError } from "@/lib/errors";
import {
  accessTokenFor,
  call,
  clearInbox,
  clearRateLimits,
  deleteTestUsers,
  expectMatches,
  latestCode,
  randomEmail,
  randomIp,
  signIn,
  waitForMailCooldown,
} from "./helpers";

const routes = { request: otpRequest, verify: otpVerify };
const REQUEST = "/api/v1/auth/otp/request";
const VERIFY = "/api/v1/auth/otp/verify";

function expectError(result: { status: number; body: unknown }, status: number, code: string) {
  expect(result.status).toBe(status);
  expectMatches(errorEnvelope, result.body);
  expect((result.body as { error: { code: string } }).error.code).toBe(code);
}

beforeAll(async () => {
  await clearInbox();
  await clearRateLimits();
});

afterAll(async () => {
  await deleteTestUsers();
});

describe("AUTH-01 request a code", () => {
  it("returns the same answer for a new and an existing address", async () => {
    const ip = randomIp();
    const fresh = await call(otpRequest, {
      method: "POST",
      path: REQUEST,
      json: { email: randomEmail() },
      ip,
    });
    const seeded = await call(otpRequest, {
      method: "POST",
      path: REQUEST,
      json: { email: "student1@alpha.test" },
      ip,
    });
    expect(fresh.status).toBe(200);
    expect(seeded.status).toBe(200);
    expectMatches(otpRequestResponse, fresh.body);
    expect(seeded.body.data).toEqual(fresh.body.data);
  });

  it("sends a 6 digit code by email", async () => {
    const email = randomEmail();
    await call(otpRequest, { method: "POST", path: REQUEST, json: { email } });
    expect(await latestCode(email)).toMatch(/^\d{6}$/);
  });

  it("VALIDATION_FAILED for a bad email, with the field named", async () => {
    const result = await call(otpRequest, {
      method: "POST",
      path: REQUEST,
      json: { email: "not-an-email" },
    });
    expectError(result, 400, "VALIDATION_FAILED");
    expect(result.body.error.details.fields[0].path).toBe("email");
  });

  it("VALIDATION_FAILED for unknown keys, bad JSON; UNSUPPORTED_MEDIA_TYPE and PAYLOAD_TOO_LARGE", async () => {
    expectError(
      await call(otpRequest, {
        method: "POST",
        path: REQUEST,
        json: { email: randomEmail(), is_admin: true },
      }),
      400,
      "VALIDATION_FAILED",
    );
    expectError(
      await call(otpRequest, { method: "POST", path: REQUEST, rawBody: "{nope" }),
      400,
      "VALIDATION_FAILED",
    );
    expectError(
      await call(otpRequest, {
        method: "POST",
        path: REQUEST,
        rawBody: "x",
        headers: { "content-type": "text/plain" },
      }),
      415,
      "UNSUPPORTED_MEDIA_TYPE",
    );
    const big = await call(otpRequest, {
      method: "POST",
      path: REQUEST,
      rawBody: JSON.stringify({ email: "a".repeat(120_000) }),
    });
    expectError(big, 413, "PAYLOAD_TOO_LARGE");
  });

  it("limits to 5 requests per hour per email, then RATE_LIMITED with Retry-After", async () => {
    const email = randomEmail();
    for (let i = 0; i < 5; i++) {
      await waitForMailCooldown(email);
      const ok = await call(otpRequest, {
        method: "POST",
        path: REQUEST,
        json: { email },
        ip: randomIp(),
      });
      expect(ok.status).toBe(200);
    }
    const sixth = await call(otpRequest, {
      method: "POST",
      path: REQUEST,
      json: { email },
      ip: randomIp(),
    });
    expectError(sixth, 429, "RATE_LIMITED");
    expect(Number(sixth.headers.get("retry-after"))).toBeGreaterThan(0);
    expect(sixth.body.error.details.retry_after_seconds).toBeGreaterThan(0);
  });

  it("limits to 20 requests per hour per IP", async () => {
    const ip = randomIp();
    for (let i = 0; i < 20; i++) {
      const ok = await call(otpRequest, {
        method: "POST",
        path: REQUEST,
        json: { email: randomEmail("ip") },
        ip,
      });
      expect(ok.status).toBe(200);
    }
    const next = await call(otpRequest, {
      method: "POST",
      path: REQUEST,
      json: { email: randomEmail("ip") },
      ip,
    });
    expectError(next, 429, "RATE_LIMITED");
  });
});

describe("AUTH-02 verify a code", () => {
  it("signs a new user in, sets HttpOnly cookies, creates the profile", async () => {
    const email = randomEmail();
    const ip = randomIp();
    await call(otpRequest, { method: "POST", path: REQUEST, json: { email }, ip });
    const code = await latestCode(email);
    const result = await call(otpVerify, {
      method: "POST",
      path: VERIFY,
      json: { email, code },
      ip,
    });
    expect(result.status).toBe(200);
    expectMatches(otpVerifyResponse, result.body);
    expect(result.body.data.is_new).toBe(true);
    expect(result.body.data.user.email).toBe(email);
    const cookies = result.headers.getSetCookie();
    expect(cookies.length).toBeGreaterThan(0);
    for (const cookie of cookies) {
      expect(cookie.toLowerCase()).toContain("httponly");
      expect(cookie.toLowerCase()).toContain("samesite=lax");
    }
    // The answer never carries tokens in the body.
    expect(JSON.stringify(result.body)).not.toMatch(/access_token|refresh_token/);
    const { data } = await adminClient()
      .from("profiles")
      .select("display_name")
      .eq("user_id", result.body.data.user.id)
      .single();
    expect(data?.display_name).toBe(email.split("@")[0]);
  });

  it("is_new is false the second time", async () => {
    const email = randomEmail();
    const first = await signIn(routes, email);
    const second = await signIn(routes, email);
    expect(first.isNew).toBe(true);
    expect(second.isNew).toBe(false);
  });

  it("OTP_INVALID for a wrong code, within the validity time", async () => {
    const email = randomEmail();
    const ip = randomIp();
    await call(otpRequest, { method: "POST", path: REQUEST, json: { email }, ip });
    const real = await latestCode(email);
    const wrong = real === "000000" ? "111111" : "000000";
    expectError(
      await call(otpVerify, { method: "POST", path: VERIFY, json: { email, code: wrong }, ip }),
      400,
      "OTP_INVALID",
    );
  });

  it("OTP_EXPIRED when the last code was sent over 10 minutes ago, or none was ever sent", async () => {
    const email = randomEmail();
    const ip = randomIp();
    await call(otpRequest, { method: "POST", path: REQUEST, json: { email }, ip });
    const real = await latestCode(email);
    const code = real === "000000" ? "111111" : "000000";
    await adminClient()
      .from("rate_limit_events")
      .update({ created_at: new Date(Date.now() - 11 * 60 * 1000).toISOString() })
      .eq("bucket", "otp_sent")
      .eq("key_hash", hashKey("email", email));
    expectError(
      await call(otpVerify, { method: "POST", path: VERIFY, json: { email, code }, ip }),
      410,
      "OTP_EXPIRED",
    );
    expectError(
      await call(otpVerify, {
        method: "POST",
        path: VERIFY,
        json: { email: randomEmail(), code: "123456" },
        ip,
      }),
      410,
      "OTP_EXPIRED",
    );
  });

  it("RATE_LIMITED (not a server error) when the mail service refuses a second code too fast", async () => {
    const email = randomEmail();
    const ip = randomIp();
    expect(
      (await call(otpRequest, { method: "POST", path: REQUEST, json: { email }, ip })).status,
    ).toBe(200);
    const again = await call(otpRequest, { method: "POST", path: REQUEST, json: { email }, ip });
    expect([200, 429]).toContain(again.status);
    if (again.status === 429) expectError(again, 429, "RATE_LIMITED");
  });

  it("VALIDATION_FAILED when the code is not 6 digits", async () => {
    expectError(
      await call(otpVerify, {
        method: "POST",
        path: VERIFY,
        json: { email: randomEmail(), code: "12345" },
      }),
      400,
      "VALIDATION_FAILED",
    );
  });

  it("locks after 5 wrong codes: even the right code gets RATE_LIMITED", async () => {
    const email = randomEmail();
    const ip = randomIp();
    await call(otpRequest, { method: "POST", path: REQUEST, json: { email }, ip });
    const real = await latestCode(email);
    const wrong = real === "000000" ? "111111" : "000000";
    for (let i = 0; i < 5; i++) {
      expectError(
        await call(otpVerify, { method: "POST", path: VERIFY, json: { email, code: wrong }, ip }),
        400,
        "OTP_INVALID",
      );
    }
    const locked = await call(otpVerify, {
      method: "POST",
      path: VERIFY,
      json: { email, code: real },
      ip,
    });
    expectError(locked, 429, "RATE_LIMITED");
    expect(Number(locked.headers.get("retry-after"))).toBeGreaterThan(0);
  });

  it("limits to 10 verify attempts per 15 minutes per email", async () => {
    const email = randomEmail();
    const key = hashKey("email", email);
    for (let i = 0; i < 10; i++) {
      await adminClient().rpc("rate_limit_record", {
        p_bucket: "otp_verify_attempt",
        p_key_hash: key,
      });
    }
    const result = await call(otpVerify, {
      method: "POST",
      path: VERIFY,
      json: { email, code: "123456" },
    });
    expectError(result, 429, "RATE_LIMITED");
  });
});

describe("AUTH-03 logout", () => {
  it("needs a session: UNAUTHENTICATED without one", async () => {
    expectError(
      await call(logout, { method: "POST", path: "/api/v1/auth/logout" }),
      401,
      "UNAUTHENTICATED",
    );
  });

  it("ends the session and clears the cookies", async () => {
    const { cookie } = await signIn(routes, randomEmail());
    const result = await call(logout, { method: "POST", path: "/api/v1/auth/logout", cookie });
    expect(result.status).toBe(200);
    expectMatches(logoutResponse, result.body);
    expect(result.headers.getSetCookie().length).toBeGreaterThan(0);
  });

  it("?all=true works, and a cookie request from another origin is FORBIDDEN", async () => {
    const { cookie } = await signIn(routes, randomEmail());
    const evil = await call(logout, {
      method: "POST",
      path: "/api/v1/auth/logout",
      cookie,
      headers: { origin: "https://evil.example" },
    });
    expectError(evil, 403, "FORBIDDEN");
    const all = await call(logout, {
      method: "POST",
      path: "/api/v1/auth/logout?all=true",
      cookie,
    });
    expect(all.status).toBe(200);
  });

  it("VALIDATION_FAILED for an unknown query parameter", async () => {
    const { cookie } = await signIn(routes, randomEmail());
    expectError(
      await call(logout, { method: "POST", path: "/api/v1/auth/logout?foo=1", cookie }),
      400,
      "VALIDATION_FAILED",
    );
  });
});

describe("TEN-02 my membership, and requireMember", () => {
  const sessions: Record<string, string> = {};
  beforeAll(async () => {
    for (const email of [
      "student1@alpha.test",
      "student3@alpha.test",
      "pending@alpha.test",
      "suspended@alpha.test",
      "admin@alpha.test",
    ]) {
      sessions[email] = (await signIn(routes, email)).cookie;
    }
  });

  const membership = (cookie: string, slug: string) =>
    call(myMembership, { path: `/api/v1/c/${slug}/me/membership`, cookie, params: { slug } });

  it("UNAUTHENTICATED without a session", async () => {
    expectError(
      await call(myMembership, {
        path: "/api/v1/c/alpha/me/membership",
        params: { slug: "alpha" },
      }),
      401,
      "UNAUTHENTICATED",
    );
  });

  it("returns the seeded active membership for the right college", async () => {
    const result = await membership(sessions["student1@alpha.test"]!, "alpha");
    expect(result.status).toBe(200);
    expectMatches(myMembershipResponse, result.body);
    expect(result.body.data.membership).toMatchObject({
      role: "student",
      status: "active",
      verification_level: 2,
    });
  });

  it("returns null for another college and for a college that does not exist", async () => {
    expect(
      (await membership(sessions["student1@alpha.test"]!, "beta")).body.data.membership,
    ).toBeNull();
    expect(
      (await membership(sessions["student1@alpha.test"]!, "nope")).body.data.membership,
    ).toBeNull();
  });

  it("pending users see their pending status", async () => {
    const result = await membership(sessions["pending@alpha.test"]!, "alpha");
    expect(result.body.data.membership).toMatchObject({ status: "pending", verification_level: 1 });
  });

  it("works with an Authorization: Bearer token too", async () => {
    const bearer = await accessTokenFor(randomEmail());
    const result = await call(myMembership, {
      path: "/api/v1/c/alpha/me/membership",
      bearer,
      params: { slug: "alpha" },
    });
    expect(result.status).toBe(200);
    expect(result.body.data.membership).toBeNull();
    expectError(
      await call(myMembership, {
        path: "/api/v1/c/alpha/me/membership",
        bearer: "not-a-token",
        params: { slug: "alpha" },
      }),
      401,
      "UNAUTHENTICATED",
    );
  });

  async function guard(
    cookie: string | undefined,
    slug: string,
    requirement?: Parameters<typeof requireMember>[3],
  ) {
    const request = new Request(`${APP}/x`, { headers: cookie ? { cookie } : {} });
    try {
      const member = await requireMember(request, new CookieJar(), slug, requirement);
      return { ok: true as const, role: member.membership.role };
    } catch (error) {
      if (error instanceof AppError) return { ok: false as const, code: error.code };
      throw error;
    }
  }
  const APP = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  it("requireMember: every outcome has the right error code", async () => {
    expect(await guard(undefined, "alpha")).toEqual({ ok: false, code: "UNAUTHENTICATED" });
    expect(await guard(sessions["student1@alpha.test"], "alpha")).toEqual({
      ok: true,
      role: "student",
    });
    expect(await guard(sessions["student1@alpha.test"], "beta")).toEqual({
      ok: false,
      code: "NOT_FOUND",
    });
    expect(await guard(sessions["student1@alpha.test"], "nope")).toEqual({
      ok: false,
      code: "NOT_FOUND",
    });
    expect(await guard(sessions["pending@alpha.test"], "alpha")).toEqual({
      ok: false,
      code: "MEMBERSHIP_NOT_ACTIVE",
    });
    expect(await guard(sessions["suspended@alpha.test"], "alpha")).toEqual({
      ok: false,
      code: "MEMBERSHIP_NOT_ACTIVE",
    });
    expect(await guard(sessions["student3@alpha.test"], "alpha", { minLevel: 2 })).toEqual({
      ok: false,
      code: "VERIFICATION_LEVEL_TOO_LOW",
    });
    expect(await guard(sessions["student3@alpha.test"], "alpha", { minLevel: 1 })).toEqual({
      ok: true,
      role: "student",
    });
    expect(
      await guard(sessions["student1@alpha.test"], "alpha", { roles: ["college_admin"] }),
    ).toEqual({ ok: false, code: "FORBIDDEN" });
    expect(
      await guard(sessions["admin@alpha.test"], "alpha", { roles: ["college_admin"] }),
    ).toEqual({ ok: true, role: "college_admin" });
  });

  it("requireMember: TENANT_SUSPENDED when the college is suspended", async () => {
    const admin = adminClient();
    await admin.from("colleges").update({ status: "suspended" }).eq("slug", "alpha");
    try {
      expect(await guard(sessions["student1@alpha.test"], "alpha")).toEqual({
        ok: false,
        code: "TENANT_SUSPENDED",
      });
    } finally {
      await admin.from("colleges").update({ status: "active" }).eq("slug", "alpha");
    }
  });
});
