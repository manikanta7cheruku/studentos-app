import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  adminSettingsPatchBody,
  errorEnvelope,
  joinOpenResponse,
  publicCollegeResponse,
} from "@/contracts";
import { POST as otpRequest } from "@/app/api/v1/auth/otp/request/route";
import { POST as otpVerify } from "@/app/api/v1/auth/otp/verify/route";
import { GET as myMembership } from "@/app/api/v1/c/[slug]/me/membership/route";
import { POST as joinOpen } from "@/app/api/v1/c/[slug]/join/open/route";
import { POST as leave } from "@/app/api/v1/c/[slug]/me/leave/route";
import { GET as publicCollege } from "@/app/api/v1/colleges/public/[slug]/route";
import { adminClient } from "@/server/admin/supabase-admin";
import { call, clearInbox, clearRateLimits, expectMatches, randomEmail, signIn } from "./helpers";

// TEN-09: anyone who is signed in can join the Global college at once, unverified (level 1). No other college allows it.

const routes = { request: otpRequest, verify: otpVerify };
const admin = adminClient();
const createdEmails: string[] = [];

async function newUser(prefix = "glob") {
  const email = randomEmail(prefix);
  createdEmails.push(email);
  const session = await signIn(routes, email);
  return { cookie: session.cookie, userId: session.userId };
}

const open = (
  cookie: string | undefined,
  slug: string,
  key: string = randomUUID(),
  json: unknown = {},
) =>
  call(joinOpen, {
    method: "POST",
    path: `/api/v1/c/${slug}/join/open`,
    json,
    cookie,
    params: { slug },
    headers: { "idempotency-key": key },
  });

const membership = (cookie: string, slug: string) =>
  call(myMembership, { path: `/api/v1/c/${slug}/me/membership`, cookie, params: { slug } });

function expectError(result: { status: number; body: unknown }, status: number, code: string) {
  expect(result.status).toBe(status);
  expectMatches(errorEnvelope, result.body);
  expect((result.body as { error: { code: string } }).error.code).toBe(code);
}

beforeAll(async () => {
  await clearInbox();
  await clearRateLimits();
}, 60_000);

afterAll(async () => {
  const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  for (const user of data?.users ?? []) {
    if (user.email && createdEmails.includes(user.email))
      await admin.auth.admin.deleteUser(user.id);
  }
});

describe("the Global college", () => {
  it("is public and allows only the open method", async () => {
    const result = await call(publicCollege, {
      path: "/api/v1/colleges/public/global",
      params: { slug: "global" },
    });
    expect(result.status).toBe(200);
    expectMatches(publicCollegeResponse, result.body);
    const data = (
      result.body as { data: { allowed_methods: string[]; modules: Record<string, boolean> } }
    ).data;
    expect(data.allowed_methods).toEqual(["open"]);
    expect(data.modules).toEqual({ campus: false, collaborate: true, career: true });
  });
});

describe("TEN-09 join open", () => {
  it("needs a session", async () => {
    expectError(await open(undefined, "global"), 401, "UNAUTHENTICATED");
  });

  it("makes an active member at level 1 with the method open, and writes an audit row", async () => {
    const user = await newUser();
    const result = await open(user.cookie, "global");
    expect(result.status).toBe(200);
    expectMatches(joinOpenResponse, result.body);
    expect((result.body as { data: { membership: object } }).data.membership).toMatchObject({
      status: "active",
      verification_level: 1,
      verification_method: "open",
    });
    const mine = await membership(user.cookie, "global");
    expect((mine.body as { data: { membership: object } }).data.membership).toMatchObject({
      role: "student",
      status: "active",
      verification_level: 1,
    });
    const { data: audit } = await admin
      .from("audit_logs")
      .select("action, metadata")
      .eq("actor_id", user.userId)
      .eq("action", "member.joined");
    expect(audit).toHaveLength(1);
    expect(audit![0]!.metadata).toMatchObject({ method: "open" });
  });

  it("a retry with the same key returns the first answer, a second request is CONFLICT", async () => {
    const user = await newUser();
    const key = randomUUID();
    const first = await open(user.cookie, "global", key);
    expect(first.status).toBe(200);
    const replay = await open(user.cookie, "global", key);
    expect(replay.status).toBe(200);
    expect(replay.headers.get("idempotent-replay")).toBe("true");
    expectError(await open(user.cookie, "global"), 409, "CONFLICT");
  });

  it("a person who left can join again", async () => {
    const user = await newUser();
    expect((await open(user.cookie, "global")).status).toBe(200);
    const left = await call(leave, {
      method: "POST",
      path: "/api/v1/c/global/me/leave",
      cookie: user.cookie,
      params: { slug: "global" },
    });
    expect(left.status).toBe(200);
    expect((await open(user.cookie, "global")).status).toBe(200);
  });

  it("every other college refuses the open method", async () => {
    const user = await newUser();
    expectError(await open(user.cookie, "alpha"), 403, "FORBIDDEN");
    expectError(await open(user.cookie, "beta"), 403, "FORBIDDEN");
    const mine = await membership(user.cookie, "alpha");
    expect((mine.body as { data: { membership: unknown } }).data.membership).toBeNull();
  });

  it("an unknown college is NOT_FOUND, and a body with fields is VALIDATION_FAILED", async () => {
    const user = await newUser();
    expectError(await open(user.cookie, "no-such-college"), 404, "NOT_FOUND");
    expectError(
      await open(user.cookie, "global", randomUUID(), { level: 3 }),
      400,
      "VALIDATION_FAILED",
    );
  });
});

describe("only Global may use open", () => {
  it("the database refuses open for any other college", async () => {
    const { data: alpha } = await admin.from("colleges").select("id").eq("slug", "alpha").single();
    const { error } = await admin
      .from("college_settings")
      .update({ allowed_methods: ["invite_code", "open"] })
      .eq("college_id", alpha!.id);
    expect(error?.code).toBe("23514");
  });

  it("a college admin cannot send open in the settings body", () => {
    expect(adminSettingsPatchBody.safeParse({ allowed_methods: ["open"] }).success).toBe(false);
    expect(adminSettingsPatchBody.safeParse({ allowed_methods: ["invite_code"] }).success).toBe(
      true,
    );
  });
});
