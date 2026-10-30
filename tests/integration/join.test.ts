import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  errorEnvelope,
  joinEmailDomainCompleteResponse,
  joinEmailDomainStartResponse,
  joinInviteResponse,
  joinManualResponse,
  publicCollegeResponse,
} from "@/contracts";
import { POST as otpRequest } from "@/app/api/v1/auth/otp/request/route";
import { POST as otpVerify } from "@/app/api/v1/auth/otp/verify/route";
import { GET as myMembership } from "@/app/api/v1/c/[slug]/me/membership/route";
import { POST as joinInvite } from "@/app/api/v1/c/[slug]/join/invite/route";
import { POST as joinManual } from "@/app/api/v1/c/[slug]/join/manual/route";
import { POST as joinEmailDomain } from "@/app/api/v1/c/[slug]/join/email-domain/route";
import { GET as publicCollege } from "@/app/api/v1/colleges/public/[slug]/route";
import { adminClient } from "@/server/admin/supabase-admin";
import { hashEnrollment, hashInviteCode } from "@/modules/tenancy/join.admin";
import { requireMember } from "@/modules/tenancy/require-member";
import { CookieJar } from "@/lib/supabase/request-client";
import { AppError } from "@/lib/errors";
import {
  call,
  clearInbox,
  clearRateLimits,
  expectMatches,
  latestCode,
  randomEmail,
  randomIp,
  signIn,
  waitForMailCooldown,
} from "./helpers";

const routes = { request: otpRequest, verify: otpVerify };
const admin = adminClient();
const run = randomUUID().slice(0, 8).toUpperCase();
const APP = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

let alphaId = "";
let betaId = "";
const createdEmails: string[] = [];

type Invite = {
  max_uses?: number;
  used_count?: number;
  expires?: number;
  revoked?: boolean;
  grants?: "active" | "pending";
  college?: string;
};

async function makeInvite(label: string, options: Invite = {}): Promise<string> {
  const code = `T${run}-${label}`.toUpperCase();
  const { error } = await admin.from("invite_codes").insert({
    college_id: options.college ?? alphaId,
    code_hash: hashInviteCode(code),
    label: `test ${label}`,
    max_uses: options.max_uses ?? 5,
    used_count: options.used_count ?? 0,
    expires_at: new Date(Date.now() + (options.expires ?? 24 * 3600 * 1000)).toISOString(),
    revoked_at: options.revoked ? new Date().toISOString() : null,
    grants_status: options.grants ?? "active",
  });
  if (error) throw error;
  return code;
}

async function newUser(
  prefix = "join",
): Promise<{ cookie: string; userId: string; email: string }> {
  const email = randomEmail(prefix);
  createdEmails.push(email);
  const session = await signIn(routes, email);
  return { cookie: session.cookie, userId: session.userId, email };
}

const invite = (cookie: string, slug: string, code: string, key: string = randomUUID()) =>
  call(joinInvite, {
    method: "POST",
    path: `/api/v1/c/${slug}/join/invite`,
    json: { code },
    cookie,
    params: { slug },
    headers: { "idempotency-key": key },
  });

const manual = (cookie: string, slug: string, json: unknown, key: string = randomUUID()) =>
  call(joinManual, {
    method: "POST",
    path: `/api/v1/c/${slug}/join/manual`,
    json,
    cookie,
    params: { slug },
    headers: { "idempotency-key": key },
  });

const domainJoin = (cookie: string, slug: string, json: unknown) =>
  call(joinEmailDomain, {
    method: "POST",
    path: `/api/v1/c/${slug}/join/email-domain`,
    json,
    cookie,
    params: { slug },
  });

function expectError(result: { status: number; body: unknown }, status: number, code: string) {
  expect(result.status).toBe(status);
  expectMatches(errorEnvelope, result.body);
  expect((result.body as { error: { code: string } }).error.code).toBe(code);
}

async function usedCount(code: string): Promise<number> {
  const { data } = await admin
    .from("invite_codes")
    .select("used_count")
    .eq("code_hash", hashInviteCode(code))
    .single();
  return data?.used_count ?? -1;
}

beforeAll(async () => {
  await clearInbox();
  await clearRateLimits();
  const { data } = await admin.from("colleges").select("id, slug").in("slug", ["alpha", "beta"]);
  alphaId = data!.find((c) => c.slug === "alpha")!.id;
  betaId = data!.find((c) => c.slug === "beta")!.id;
}, 60_000);

afterAll(async () => {
  await admin.from("invite_codes").delete().like("label", "test %");
  // Remove the people this run created (their memberships go with them; admins stay, so the guard allows it).
  const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  for (const user of data?.users ?? []) {
    if (user.email && (createdEmails.includes(user.email) || user.email.startsWith("proof-"))) {
      await admin.auth.admin.deleteUser(user.id);
    }
  }
  await admin.from("audit_logs").select("id").limit(1); // audit rows stay: they are append only
}, 60_000);

describe("TEN-01 public college", () => {
  it("shows branding and methods to anyone, without a session", async () => {
    const result = await call(publicCollege, {
      path: "/api/v1/colleges/public/alpha",
      params: { slug: "alpha" },
    });
    expect(result.status).toBe(200);
    expectMatches(publicCollegeResponse, result.body);
    expect(result.body.data).toMatchObject({ slug: "alpha", name: "Alpha College" });
    expect(JSON.stringify(result.body)).not.toMatch(/college_id|created_by|status/);
  });

  it("NOT_FOUND for an unknown college and for one that is not active", async () => {
    expectError(
      await call(publicCollege, { path: "/api/v1/colleges/public/nope", params: { slug: "nope" } }),
      404,
      "NOT_FOUND",
    );
    expectError(
      await call(publicCollege, { path: "/api/v1/colleges/public/BAD!", params: { slug: "BAD!" } }),
      404,
      "NOT_FOUND",
    );
    await admin.from("colleges").update({ status: "suspended" }).eq("slug", "beta");
    try {
      expectError(
        await call(publicCollege, {
          path: "/api/v1/colleges/public/beta",
          params: { slug: "beta" },
        }),
        404,
        "NOT_FOUND",
      );
    } finally {
      await admin.from("colleges").update({ status: "active" }).eq("slug", "beta");
    }
  });
});

describe("TEN-03 invite code", () => {
  it("needs a session and an Idempotency-Key", async () => {
    expectError(
      await call(joinInvite, {
        method: "POST",
        path: "/api/v1/c/alpha/join/invite",
        json: { code: "X" },
        params: { slug: "alpha" },
        headers: { "idempotency-key": randomUUID() },
      }),
      401,
      "UNAUTHENTICATED",
    );
    const user = await newUser();
    const noKey = await call(joinInvite, {
      method: "POST",
      path: "/api/v1/c/alpha/join/invite",
      json: { code: "X" },
      cookie: user.cookie,
      params: { slug: "alpha" },
    });
    expectError(noKey, 400, "VALIDATION_FAILED");
    expect(noKey.body.error.details.fields[0].path).toBe("Idempotency-Key");
  });

  it("a good code makes an active member at level 2, and writes an audit row", async () => {
    const code = await makeInvite("GOOD");
    const user = await newUser();
    const result = await invite(user.cookie, "alpha", code);
    expect(result.status).toBe(200);
    expectMatches(joinInviteResponse, result.body);
    expect(result.body.data.membership).toMatchObject({
      status: "active",
      verification_level: 2,
      verification_method: "invite_code",
    });

    const mine = await call(myMembership, {
      path: "/api/v1/c/alpha/me/membership",
      cookie: user.cookie,
      params: { slug: "alpha" },
    });
    expect(mine.body.data.membership).toMatchObject({ role: "student", status: "active" });

    const requestId = result.headers.get("x-request-id")!;
    const { data: audit } = await admin
      .from("audit_logs")
      .select("action, actor_id, metadata")
      .eq("request_id", requestId);
    expect(audit).toHaveLength(1);
    expect(audit![0]).toMatchObject({ action: "member.joined", actor_id: user.userId });
    expect(JSON.stringify(audit![0]!.metadata)).not.toContain(code);
  });

  it("the same Idempotency-Key and body replays the first answer and uses no second invite", async () => {
    const code = await makeInvite("REPLAY");
    const user = await newUser();
    const key = randomUUID();
    const first = await invite(user.cookie, "alpha", code, key);
    const again = await invite(user.cookie, "alpha", code, key);
    expect(first.status).toBe(200);
    expect(again.status).toBe(200);
    expect(again.headers.get("idempotent-replay")).toBe("true");
    expect(again.body.data).toEqual(first.body.data);
    expect(await usedCount(code)).toBe(1);
    // The same key with another body is refused.
    const other = await makeInvite("REPLAY2");
    expectError(await invite(user.cookie, "alpha", other, key), 422, "IDEMPOTENCY_KEY_REUSED");
  });

  it("each failure has its own error code", async () => {
    const user = await newUser();
    expectError(await invite(user.cookie, "alpha", "T-NOPE-NOPE"), 400, "INVITE_INVALID");
    expectError(
      await invite(user.cookie, "alpha", await makeInvite("REV", { revoked: true })),
      400,
      "INVITE_INVALID",
    );
    expectError(
      await invite(user.cookie, "alpha", await makeInvite("OLD", { expires: -1000 })),
      410,
      "INVITE_EXPIRED",
    );
    expectError(
      await invite(user.cookie, "alpha", await makeInvite("FULL", { max_uses: 1, used_count: 1 })),
      409,
      "INVITE_EXHAUSTED",
    );
    expectError(
      await invite(user.cookie, "beta", await makeInvite("ALPHAONLY")),
      400,
      "INVITE_INVALID",
    );
    expectError(await invite(user.cookie, "nope", "T-ANY"), 404, "NOT_FOUND");
  });

  it("CONFLICT for a member who tries again, and the invite is not used up", async () => {
    const code = await makeInvite("TWICE");
    const user = await newUser();
    expect((await invite(user.cookie, "alpha", code)).status).toBe(200);
    expectError(await invite(user.cookie, "alpha", code), 409, "CONFLICT");
    expect(await usedCount(code)).toBe(1);
  });

  it("TENANT_SUSPENDED when the college is suspended", async () => {
    const code = await makeInvite("SUSP");
    const user = await newUser();
    await admin.from("colleges").update({ status: "suspended" }).eq("slug", "alpha");
    try {
      expectError(await invite(user.cookie, "alpha", code), 403, "TENANT_SUSPENDED");
    } finally {
      await admin.from("colleges").update({ status: "active" }).eq("slug", "alpha");
    }
    expect(await usedCount(code)).toBe(0);
  });

  it("a code that grants pending makes a pending member, who cannot use member endpoints", async () => {
    const code = await makeInvite("PEND", { grants: "pending" });
    const user = await newUser();
    const result = await invite(user.cookie, "alpha", code);
    expect(result.body.data.membership).toMatchObject({ status: "pending", verification_level: 1 });
    const request = new Request(`${APP}/x`, { headers: { cookie: user.cookie } });
    const error = await requireMember(request, new CookieJar(), "alpha").catch((e) => e);
    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).code).toBe("MEMBERSHIP_NOT_ACTIVE");
    const { data } = await admin
      .from("verification_requests")
      .select("status")
      .eq("membership_id", result.body.data.membership.id);
    expect(data).toEqual([{ status: "pending" }]);
  });

  it("a college that switched invite codes off answers like a wrong code", async () => {
    const code = await makeInvite("OFF", { college: betaId });
    const user = await newUser();
    await admin
      .from("college_settings")
      .update({ allowed_methods: ["manual"] })
      .eq("college_id", betaId);
    try {
      expectError(await invite(user.cookie, "beta", code), 400, "INVITE_INVALID");
    } finally {
      await admin
        .from("college_settings")
        .update({ allowed_methods: ["invite_code", "manual"] })
        .eq("college_id", betaId);
    }
  });

  it("CONCURRENCY: 10 people redeem a code with 3 uses, exactly 3 succeed", async () => {
    const code = await makeInvite("RACE", { max_uses: 3 });
    const users = [];
    for (let i = 0; i < 10; i++) users.push(await newUser("race"));
    const results = await Promise.all(users.map((u) => invite(u.cookie, "alpha", code)));
    const succeeded = results.filter((r) => r.status === 200);
    const exhausted = results.filter(
      (r) => r.status === 409 && r.body.error.code === "INVITE_EXHAUSTED",
    );
    expect(succeeded).toHaveLength(3);
    expect(exhausted).toHaveLength(7);
    expect(await usedCount(code)).toBe(3);
    const { count } = await admin
      .from("memberships")
      .select("id", { count: "exact", head: true })
      .in(
        "user_id",
        users.map((u) => u.userId),
      );
    expect(count).toBe(3);
  });

  it("brute force guard: 10 tries per hour per person, then RATE_LIMITED", async () => {
    const user = await newUser();
    for (let i = 0; i < 10; i++) {
      expectError(await invite(user.cookie, "alpha", `T-GUESS-${i}`), 400, "INVITE_INVALID");
    }
    const blocked = await invite(user.cookie, "alpha", "T-GUESS-11");
    expectError(blocked, 429, "RATE_LIMITED");
    expect(Number(blocked.headers.get("retry-after"))).toBeGreaterThan(0);
  });
});

describe("TEN-04 manual request", () => {
  const body = (enrollment: string) => ({
    enrollment_number: enrollment,
    program: "B.Tech ECE",
    grad_year: 2027,
  });

  it("makes a pending member, keeps only a hash and the last 4 characters, writes an audit row", async () => {
    const enrollment = `21ab${run}01`;
    const user = await newUser();
    const result = await manual(user.cookie, "alpha", body(enrollment));
    expect(result.status).toBe(200);
    expectMatches(joinManualResponse, result.body);
    expect(result.body.data.membership).toMatchObject({
      status: "pending",
      verification_level: 1,
      verification_method: "manual",
    });

    const { data } = await admin
      .from("memberships")
      .select("enrollment_hash, enrollment_last4, program, grad_year")
      .eq("user_id", user.userId)
      .single();
    expect(data?.enrollment_last4).toBe(enrollment.slice(-4).toUpperCase());
    expect(data?.enrollment_hash).toBe(hashEnrollment("alpha", enrollment));
    expect(JSON.stringify(data)).not.toContain(enrollment);

    const { data: req } = await admin
      .from("verification_requests")
      .select("status, method, submitted_data")
      .eq("membership_id", result.body.data.membership.id)
      .single();
    expect(req).toMatchObject({ status: "pending", method: "manual" });
    expect(JSON.stringify(req)).not.toContain(enrollment);

    const { data: audit } = await admin
      .from("audit_logs")
      .select("action")
      .eq("request_id", result.headers.get("x-request-id")!);
    expect(audit).toEqual([{ action: "member.join_requested" }]);
  });

  it("the same enrolment number cannot be used by a second person, but can in another college", async () => {
    const enrollment = `22cd${run}02`;
    const first = await newUser();
    const second = await newUser();
    expect((await manual(first.cookie, "alpha", body(enrollment))).status).toBe(200);
    expectError(await manual(second.cookie, "alpha", body(enrollment)), 409, "CONFLICT");
    expect((await manual(second.cookie, "beta", body(enrollment))).status).toBe(200);
  });

  it("a pending person cannot send a second request; replay with the same key returns the first answer", async () => {
    const user = await newUser();
    const key = randomUUID();
    const first = await manual(user.cookie, "alpha", body(`23ef${run}03`), key);
    const replay = await manual(user.cookie, "alpha", body(`23ef${run}03`), key);
    expect(replay.headers.get("idempotent-replay")).toBe("true");
    expect(replay.body.data).toEqual(first.body.data);
    expectError(await manual(user.cookie, "alpha", body(`24gh${run}04`)), 409, "CONFLICT");
  });

  it("VALIDATION_FAILED for a bad year, a short number, or fields a client must not send", async () => {
    const user = await newUser();
    expectError(
      await manual(user.cookie, "alpha", { ...body("21AB0001"), grad_year: 1999 }),
      400,
      "VALIDATION_FAILED",
    );
    expectError(await manual(user.cookie, "alpha", body("12")), 400, "VALIDATION_FAILED");
    expectError(
      await manual(user.cookie, "alpha", { ...body("21AB0001"), status: "active" }),
      400,
      "VALIDATION_FAILED",
    );
    expectError(
      await manual(user.cookie, "alpha", { ...body("21AB0001"), verification_level: 3 }),
      400,
      "VALIDATION_FAILED",
    );
  });

  it("needs a session", async () => {
    expectError(
      await call(joinManual, {
        method: "POST",
        path: "/api/v1/c/alpha/join/manual",
        json: body("21AB0001"),
        params: { slug: "alpha" },
        headers: { "idempotency-key": randomUUID() },
      }),
      401,
      "UNAUTHENTICATED",
    );
  });
});

describe("TEN-05 college email", () => {
  it("needs a session", async () => {
    expectError(
      await call(joinEmailDomain, {
        method: "POST",
        path: "/api/v1/c/alpha/join/email-domain",
        json: { step: "start", email: "x@alpha.test" },
        params: { slug: "alpha" },
      }),
      401,
      "UNAUTHENTICATED",
    );
  });

  it("refuses an address that is not on a registered domain of this college", async () => {
    const user = await newUser();
    for (const email of ["someone@gmail.com", "someone@beta.test", "someone@alpha.test.evil.com"]) {
      const result = await domainJoin(user.cookie, "alpha", { step: "start", email });
      expectError(result, 400, "VALIDATION_FAILED");
      expect(result.body.error.details.fields[0].path).toBe("email");
    }
  });

  it("proves control of a college address, then the member is active at level 2", async () => {
    const user = await newUser();
    const proof = `proof-${randomUUID().slice(0, 8)}@alpha.test`;
    const started = await domainJoin(user.cookie, "alpha", { step: "start", email: proof });
    expect(started.status).toBe(200);
    expectMatches(joinEmailDomainStartResponse, started.body);

    const code = await latestCode(proof);
    const wrong = code === "000000" ? "111111" : "000000";
    expectError(
      await domainJoin(user.cookie, "alpha", { step: "complete", email: proof, code: wrong }),
      400,
      "OTP_INVALID",
    );

    const done = await domainJoin(user.cookie, "alpha", { step: "complete", email: proof, code });
    expect(done.status).toBe(200);
    expectMatches(joinEmailDomainCompleteResponse, done.body);
    expect(done.body.data.membership).toMatchObject({
      status: "active",
      verification_level: 2,
      verification_method: "email_domain",
    });
    // No session was created or changed by the proof.
    expect(done.headers.getSetCookie()).toHaveLength(0);

    const mine = await call(myMembership, {
      path: "/api/v1/c/alpha/me/membership",
      cookie: user.cookie,
      params: { slug: "alpha" },
    });
    expect(mine.body.data.membership).toMatchObject({ status: "active", verification_level: 2 });
    const { data: audit } = await admin
      .from("audit_logs")
      .select("action, metadata")
      .eq("request_id", done.headers.get("x-request-id")!);
    expect(audit).toHaveLength(1);
    expect(audit![0]!.metadata).toMatchObject({ method: "email_domain", domain: "alpha.test" });

    expectError(
      await domainJoin(user.cookie, "alpha", { step: "start", email: proof }),
      409,
      "CONFLICT",
    );
  });

  it("a code sent to a gmail address can never be used to join Alpha", async () => {
    const user = await newUser();
    const other = await newUser();
    const mail = other.email; // example.test is not a college domain
    await waitForMailCooldown(mail);
    await call(otpRequest, {
      method: "POST",
      path: "/api/v1/auth/otp/request",
      json: { email: mail },
      ip: randomIp(),
    });
    const code = await latestCode(mail);
    expectError(
      await domainJoin(user.cookie, "alpha", { step: "complete", email: mail, code }),
      400,
      "VALIDATION_FAILED",
    );
  });
});
