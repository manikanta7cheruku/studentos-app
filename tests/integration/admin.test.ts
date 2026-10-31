import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  adminSettingsResponse,
  adminStatsResponse,
  auditLogListResponse,
  errorEnvelope,
  inviteCreateResponse,
  inviteListResponse,
  inviteRevokeResponse,
  memberListResponse,
  memberPatchResponse,
  verificationDecisionResponse,
  verificationRequestListResponse,
} from "@/contracts";
import { POST as otpRequest } from "@/app/api/v1/auth/otp/request/route";
import { POST as otpVerify } from "@/app/api/v1/auth/otp/verify/route";
import { POST as joinInvite } from "@/app/api/v1/c/[slug]/join/invite/route";
import { POST as joinManual } from "@/app/api/v1/c/[slug]/join/manual/route";
import {
  GET as getSettings,
  PATCH as patchSettings,
} from "@/app/api/v1/c/[slug]/admin/settings/route";
import { GET as getStats } from "@/app/api/v1/c/[slug]/admin/stats/route";
import {
  GET as listInvites,
  POST as createInvite,
} from "@/app/api/v1/c/[slug]/admin/invites/route";
import { DELETE as revokeInvite } from "@/app/api/v1/c/[slug]/admin/invites/[id]/route";
import { GET as listQueue } from "@/app/api/v1/c/[slug]/admin/verification-requests/route";
import { POST as decide } from "@/app/api/v1/c/[slug]/admin/verification-requests/[id]/decision/route";
import { GET as listMembers } from "@/app/api/v1/c/[slug]/admin/members/route";
import { PATCH as patchMember } from "@/app/api/v1/c/[slug]/admin/members/[membershipId]/route";
import { GET as listAudit } from "@/app/api/v1/c/[slug]/admin/audit-logs/route";
import { adminClient } from "@/server/admin/supabase-admin";
import { hashInviteCode } from "@/modules/tenancy/join.admin";
import {
  call,
  clearInbox,
  clearRateLimits,
  expectMatches,
  randomEmail,
  signIn,
  type Result,
} from "./helpers";

const routes = { request: otpRequest, verify: otpVerify };
const admin = adminClient();
const run = randomUUID().slice(0, 8).toUpperCase();
const SLUG = "alpha";
const base = `/api/v1/c/${SLUG}/admin`;
const idem = () => ({ "idempotency-key": randomUUID() });

type Who = "anon" | "pending" | "suspended" | "student" | "moderator" | "admin" | "other_admin";
const emails: Record<Exclude<Who, "anon">, string> = {
  pending: "pending@alpha.test",
  suspended: "suspended@alpha.test",
  student: "student1@alpha.test",
  moderator: "moderator@alpha.test",
  admin: "admin@alpha.test",
  other_admin: "admin@beta.test",
};
const cookies: Partial<Record<Who, string>> = {};
const userIds: Partial<Record<Who, string>> = {};
const createdEmails: string[] = [];
let originalSettings: Record<string, unknown> = {};

const asAdmin = (handler: unknown, path: string, options: Record<string, unknown> = {}) =>
  call(handler, {
    path: `${base}${path}`,
    cookie: cookies.admin,
    params: { slug: SLUG },
    ...options,
  });

const expectError = (result: Result, status: number, code: string) => {
  expect(result.status).toBe(status);
  expectMatches(errorEnvelope, result.body);
  expect(result.body.error.code).toBe(code);
};

async function newPerson(prefix = "adm") {
  const email = randomEmail(prefix);
  createdEmails.push(email);
  const session = await signIn(routes, email);
  return { ...session, email };
}

async function joinByManual(person: { cookie: string }, enrollment: string) {
  const result = await call(joinManual, {
    method: "POST",
    path: `/api/v1/c/${SLUG}/join/manual`,
    json: { enrollment_number: enrollment, program: "B.Tech CSE", grad_year: 2028 },
    cookie: person.cookie,
    params: { slug: SLUG },
    headers: idem(),
  });
  expect(result.status).toBe(200);
  return result.body.data.membership.id as string;
}

async function queueIdFor(membershipId: string): Promise<string> {
  const { data } = await admin
    .from("verification_requests")
    .select("id")
    .eq("membership_id", membershipId)
    .single();
  return data!.id;
}

async function auditCount(): Promise<number> {
  const { count } = await admin
    .from("audit_logs")
    .select("id", { count: "exact", head: true })
    .eq("college_id", await collegeId());
  return count ?? 0;
}
let cachedCollege = "";
async function collegeId(): Promise<string> {
  if (!cachedCollege)
    cachedCollege = (await admin.from("colleges").select("id").eq("slug", SLUG).single()).data!.id;
  return cachedCollege;
}

beforeAll(async () => {
  await clearInbox();
  await clearRateLimits();
  for (const [who, email] of Object.entries(emails)) {
    const session = await signIn(routes, email);
    cookies[who as Who] = session.cookie;
    userIds[who as Who] = session.userId;
  }
  const { data } = await admin
    .from("college_settings")
    .select("*")
    .eq("college_id", await collegeId())
    .single();
  originalSettings = data!;
}, 120_000);

// The admin limit is 120 calls a minute per person. A test file makes many calls, so start each test clean.
beforeEach(async () => {
  await clearRateLimits();
});

afterAll(async () => {
  await admin
    .from("college_settings")
    .update({
      allowed_methods: originalSettings.allowed_methods as string[],
      require_admin_approval: originalSettings.require_admin_approval as boolean,
      min_level_to_post: originalSettings.min_level_to_post as number,
      features: originalSettings.features as object,
    })
    .eq("college_id", await collegeId());
  await admin.from("invite_codes").delete().like("label", "adm-test %");
  const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  for (const user of data?.users ?? []) {
    if (user.email && createdEmails.includes(user.email))
      await admin.auth.admin.deleteUser(user.id);
  }
}, 120_000);

// ---------------------------------------------------------------------------
// Who may call the admin endpoints (the "student gets 403 on every admin endpoint" rule)
// ---------------------------------------------------------------------------
const someUuid = "11111111-1111-4111-8111-111111111111";
const endpoints: {
  name: string;
  send: (cookie?: string, slug?: string) => Promise<Result>;
  adminStatus: number;
}[] = [
  {
    name: "ADM-03 GET settings",
    adminStatus: 200,
    send: (c, s = SLUG) =>
      call(getSettings, { path: `/api/v1/c/${s}/admin/settings`, cookie: c, params: { slug: s } }),
  },
  {
    name: "ADM-03 PATCH settings",
    adminStatus: 400,
    send: (c, s = SLUG) =>
      call(patchSettings, {
        method: "PATCH",
        path: `/api/v1/c/${s}/admin/settings`,
        json: {},
        cookie: c,
        params: { slug: s },
      }),
  },
  {
    name: "ADM-11 GET stats",
    adminStatus: 200,
    send: (c, s = SLUG) =>
      call(getStats, { path: `/api/v1/c/${s}/admin/stats`, cookie: c, params: { slug: s } }),
  },
  {
    name: "ADM-05 GET invites",
    adminStatus: 200,
    send: (c, s = SLUG) =>
      call(listInvites, { path: `/api/v1/c/${s}/admin/invites`, cookie: c, params: { slug: s } }),
  },
  {
    name: "ADM-05 POST invites",
    adminStatus: 400,
    send: (c, s = SLUG) =>
      call(createInvite, {
        method: "POST",
        path: `/api/v1/c/${s}/admin/invites`,
        json: {},
        cookie: c,
        params: { slug: s },
        headers: idem(),
      }),
  },
  {
    name: "ADM-05 DELETE invite",
    adminStatus: 404,
    send: (c, s = SLUG) =>
      call(revokeInvite, {
        method: "DELETE",
        path: `/api/v1/c/${s}/admin/invites/${someUuid}`,
        cookie: c,
        params: { slug: s, id: someUuid },
      }),
  },
  {
    name: "ADM-06 GET verification-requests",
    adminStatus: 200,
    send: (c, s = SLUG) =>
      call(listQueue, {
        path: `/api/v1/c/${s}/admin/verification-requests`,
        cookie: c,
        params: { slug: s },
      }),
  },
  {
    name: "ADM-07 POST decision",
    adminStatus: 400,
    send: (c, s = SLUG) =>
      call(decide, {
        method: "POST",
        path: `/api/v1/c/${s}/admin/verification-requests/${someUuid}/decision`,
        json: {},
        cookie: c,
        params: { slug: s, id: someUuid },
        headers: idem(),
      }),
  },
  {
    name: "ADM-08 GET members",
    adminStatus: 200,
    send: (c, s = SLUG) =>
      call(listMembers, { path: `/api/v1/c/${s}/admin/members`, cookie: c, params: { slug: s } }),
  },
  {
    name: "ADM-09 PATCH member",
    adminStatus: 400,
    send: (c, s = SLUG) =>
      call(patchMember, {
        method: "PATCH",
        path: `/api/v1/c/${s}/admin/members/${someUuid}`,
        json: {},
        cookie: c,
        params: { slug: s, membershipId: someUuid },
      }),
  },
  {
    name: "ADM-10 GET audit-logs",
    adminStatus: 200,
    send: (c, s = SLUG) =>
      call(listAudit, { path: `/api/v1/c/${s}/admin/audit-logs`, cookie: c, params: { slug: s } }),
  },
];

describe("who may call the admin endpoints", () => {
  for (const endpoint of endpoints) {
    describe(endpoint.name, () => {
      it("not signed in: 401", async () =>
        expectError(await endpoint.send(undefined), 401, "UNAUTHENTICATED"));
      it("pending member: 403 MEMBERSHIP_NOT_ACTIVE", async () =>
        expectError(await endpoint.send(cookies.pending), 403, "MEMBERSHIP_NOT_ACTIVE"));
      it("suspended member: 403 MEMBERSHIP_NOT_ACTIVE", async () =>
        expectError(await endpoint.send(cookies.suspended), 403, "MEMBERSHIP_NOT_ACTIVE"));
      it("student: 403 FORBIDDEN", async () =>
        expectError(await endpoint.send(cookies.student), 403, "FORBIDDEN"));
      it("moderator: 403 FORBIDDEN", async () =>
        expectError(await endpoint.send(cookies.moderator), 403, "FORBIDDEN"));
      it("admin of another college: 404 NOT_FOUND", async () =>
        expectError(await endpoint.send(cookies.other_admin), 404, "NOT_FOUND"));
      it(`admin: gets through (${endpoint.adminStatus})`, async () =>
        expect((await endpoint.send(cookies.admin)).status).toBe(endpoint.adminStatus));
    });
  }

  it("a bad slug is NOT_FOUND, and a suspended college is TENANT_SUSPENDED", async () => {
    expectError(await endpoints[0]!.send(cookies.admin, "BAD!"), 404, "NOT_FOUND");
    await admin.from("colleges").update({ status: "suspended" }).eq("slug", SLUG);
    try {
      expectError(await endpoints[0]!.send(cookies.admin), 403, "TENANT_SUSPENDED");
    } finally {
      await admin.from("colleges").update({ status: "active" }).eq("slug", SLUG);
    }
  });

  it("a cookie request from another origin is FORBIDDEN on changes", async () => {
    const result = await call(patchSettings, {
      method: "PATCH",
      path: `${base}/settings`,
      json: { min_level_to_post: 1 },
      cookie: cookies.admin,
      params: { slug: SLUG },
      headers: { origin: "https://evil.example" },
    });
    expectError(result, 403, "FORBIDDEN");
  });
});

// ---------------------------------------------------------------------------
// ADM-03 settings and ADM-11 stats
// ---------------------------------------------------------------------------
describe("ADM-03 settings and ADM-11 stats", () => {
  it("GET returns the settings with the read only college block", async () => {
    const result = await asAdmin(getSettings, "/settings");
    expect(result.status).toBe(200);
    expectMatches(adminSettingsResponse, result.body);
    expect(result.body.data.college).toMatchObject({ name: "Alpha College", status: "active" });
    expect(result.body.data.college.domains).toEqual([{ domain: "alpha.test", verified: true }]);
  });

  it("PATCH changes only what is sent and writes exactly one audit row", async () => {
    const before = await auditCount();
    const result = await asAdmin(patchSettings, "/settings", {
      method: "PATCH",
      json: { min_level_to_post: 2, features: { team_finder: true } },
    });
    expect(result.status).toBe(200);
    expectMatches(adminSettingsResponse, result.body);
    expect(result.body.data).toMatchObject({
      min_level_to_post: 2,
      features: { team_finder: true },
    });
    expect(result.body.data.allowed_methods).toEqual(originalSettings.allowed_methods);
    expect(await auditCount()).toBe(before + 1);
    const { data } = await admin
      .from("audit_logs")
      .select("action, actor_id, metadata")
      .eq("request_id", result.headers.get("x-request-id")!);
    expect(data).toHaveLength(1);
    expect(data![0]).toMatchObject({
      action: "settings.updated",
      metadata: { changed: ["features", "min_level_to_post"] },
    });
  });

  it("refuses bad values and sharing between colleges, without an audit row", async () => {
    const before = await auditCount();
    expectError(
      await asAdmin(patchSettings, "/settings", {
        method: "PATCH",
        json: { allowed_methods: ["sms"] },
      }),
      400,
      "VALIDATION_FAILED",
    );
    expectError(
      await asAdmin(patchSettings, "/settings", { method: "PATCH", json: { allowed_methods: [] } }),
      400,
      "VALIDATION_FAILED",
    );
    expectError(
      await asAdmin(patchSettings, "/settings", {
        method: "PATCH",
        json: { network_visibility: "full_shared" },
      }),
      400,
      "VALIDATION_FAILED",
    );
    expectError(
      await asAdmin(patchSettings, "/settings", {
        method: "PATCH",
        json: { college_id: someUuid },
      }),
      400,
      "VALIDATION_FAILED",
    );
    expect(await auditCount()).toBe(before);
  });

  it("stats count members, waiting requests and usable invites", async () => {
    const result = await asAdmin(getStats, "/stats");
    expect(result.status).toBe(200);
    expectMatches(adminStatsResponse, result.body);
    expect(result.body.data.total_members).toBeGreaterThanOrEqual(5);
  });
});

// ---------------------------------------------------------------------------
// ADM-05 invites
// ---------------------------------------------------------------------------
describe("ADM-05 invites", () => {
  const body = (label: string, extra: Record<string, unknown> = {}) => ({
    label: `adm-test ${label}`,
    max_uses: 2,
    expires_at: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
    grants_status: "active",
    ...extra,
  });

  it("creates an invite, shows the code once, stores only its hash, and writes one audit row", async () => {
    const before = await auditCount();
    const result = await asAdmin(createInvite, "/invites", {
      method: "POST",
      json: body("create"),
      headers: idem(),
    });
    expect(result.status).toBe(201);
    expectMatches(inviteCreateResponse, result.body);
    const { invite, code } = result.body.data;
    expect(code).toMatch(/^ALPHA-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    expect(invite).toMatchObject({
      status: "active",
      used_count: 0,
      max_uses: 2,
      grants_status: "active",
    });

    const { data: row } = await admin
      .from("invite_codes")
      .select("code_hash")
      .eq("id", invite.id)
      .single();
    expect(row!.code_hash).toBe(hashInviteCode(code));
    expect(row!.code_hash).not.toContain(code);
    expect(await auditCount()).toBe(before + 1);
    const { data: audit } = await admin
      .from("audit_logs")
      .select("action, metadata")
      .eq("request_id", result.headers.get("x-request-id")!);
    expect(audit).toHaveLength(1);
    expect(audit![0]!.action).toBe("invite.created");
    expect(JSON.stringify(audit![0]!.metadata)).not.toContain(code);
  });

  it("a person can join with the new code, and the list shows it used", async () => {
    const created = await asAdmin(createInvite, "/invites", {
      method: "POST",
      json: body("join"),
      headers: idem(),
    });
    const person = await newPerson();
    const joined = await call(joinInvite, {
      method: "POST",
      path: `/api/v1/c/${SLUG}/join/invite`,
      json: { code: created.body.data.code },
      cookie: person.cookie,
      params: { slug: SLUG },
      headers: idem(),
    });
    expect(joined.status).toBe(200);
    expect(joined.body.data.membership).toMatchObject({ status: "active", verification_level: 2 });
    const list = await asAdmin(listInvites, "/invites");
    expectMatches(inviteListResponse, list.body);
    const row = list.body.data.find((i: { id: string }) => i.id === created.body.data.invite.id);
    expect(row).toMatchObject({ used_count: 1, status: "active" });
  });

  it("the same Idempotency-Key replays the invite but never the code, and creates nothing new", async () => {
    const payload = body("replay");
    const key = randomUUID();
    const first = await asAdmin(createInvite, "/invites", {
      method: "POST",
      json: payload,
      headers: { "idempotency-key": key },
    });
    const replay = await asAdmin(createInvite, "/invites", {
      method: "POST",
      json: payload,
      headers: { "idempotency-key": key },
    });
    expect(first.status).toBe(201);
    expect(first.body.data.code).toBeTruthy();
    expect(replay.status).toBe(201);
    expect(replay.headers.get("idempotent-replay")).toBe("true");
    expect(replay.body.data.code).toBeNull();
    expect(replay.body.data.invite.id).toBe(first.body.data.invite.id);
    const { data: stored } = await admin
      .from("idempotency_keys")
      .select("response")
      .eq("key", key)
      .single();
    expect(JSON.stringify(stored)).not.toContain(first.body.data.code);
    const { count } = await admin
      .from("invite_codes")
      .select("id", { count: "exact", head: true })
      .eq("label", "adm-test replay");
    expect(count).toBe(1);
    // The same key with another body is refused.
    const other = await asAdmin(createInvite, "/invites", {
      method: "POST",
      json: body("replay-other"),
      headers: { "idempotency-key": key },
    });
    expectError(other, 422, "IDEMPOTENCY_KEY_REUSED");
  });

  it("refuses an end date in the past or over a year away, and a missing Idempotency-Key", async () => {
    const past = await asAdmin(createInvite, "/invites", {
      method: "POST",
      json: body("past", { expires_at: new Date(Date.now() - 1000).toISOString() }),
      headers: idem(),
    });
    expectError(past, 400, "VALIDATION_FAILED");
    expect(past.body.error.details.fields[0].path).toBe("expires_at");
    expectError(
      await asAdmin(createInvite, "/invites", {
        method: "POST",
        json: body("far", {
          expires_at: new Date(Date.now() + 400 * 24 * 3600 * 1000).toISOString(),
        }),
        headers: idem(),
      }),
      400,
      "VALIDATION_FAILED",
    );
    expectError(
      await asAdmin(createInvite, "/invites", { method: "POST", json: body("nokey") }),
      400,
      "VALIDATION_FAILED",
    );
  });

  it("revokes an invite once, then 409; a revoked code stops working; 404 for an unknown id", async () => {
    const created = await asAdmin(createInvite, "/invites", {
      method: "POST",
      json: body("revoke"),
      headers: idem(),
    });
    const id = created.body.data.invite.id;
    const before = await auditCount();
    const revoked = await asAdmin(revokeInvite, `/invites/${id}`, {
      method: "DELETE",
      params: { slug: SLUG, id },
    });
    expect(revoked.status).toBe(200);
    expectMatches(inviteRevokeResponse, revoked.body);
    expect(revoked.body.data.invite.status).toBe("revoked");
    expect(await auditCount()).toBe(before + 1);
    expectError(
      await asAdmin(revokeInvite, `/invites/${id}`, {
        method: "DELETE",
        params: { slug: SLUG, id },
      }),
      409,
      "CONFLICT",
    );
    expectError(
      await asAdmin(revokeInvite, `/invites/${someUuid}`, {
        method: "DELETE",
        params: { slug: SLUG, id: someUuid },
      }),
      404,
      "NOT_FOUND",
    );
    expectError(
      await asAdmin(revokeInvite, "/invites/not-a-uuid", {
        method: "DELETE",
        params: { slug: SLUG, id: "not-a-uuid" },
      }),
      404,
      "NOT_FOUND",
    );
    const person = await newPerson();
    const tryJoin = await call(joinInvite, {
      method: "POST",
      path: `/api/v1/c/${SLUG}/join/invite`,
      json: { code: created.body.data.code },
      cookie: person.cookie,
      params: { slug: SLUG },
      headers: idem(),
    });
    expectError(tryJoin, 400, "INVITE_INVALID");
  });

  it("an admin of another college cannot revoke this college's invite", async () => {
    const created = await asAdmin(createInvite, "/invites", {
      method: "POST",
      json: body("foreign"),
      headers: idem(),
    });
    const id = created.body.data.invite.id;
    const result = await call(revokeInvite, {
      method: "DELETE",
      path: `/api/v1/c/beta/admin/invites/${id}`,
      cookie: cookies.other_admin,
      params: { slug: "beta", id },
    });
    expectError(result, 404, "NOT_FOUND");
  });

  it("the list shows state: exhausted and expired invites are marked", async () => {
    const collegeUuid = await collegeId();
    await admin.from("invite_codes").insert([
      {
        college_id: collegeUuid,
        code_hash: hashInviteCode(`ADM-FULL-${run}`),
        label: "adm-test full",
        max_uses: 1,
        used_count: 1,
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        grants_status: "active",
      },
      {
        college_id: collegeUuid,
        code_hash: hashInviteCode(`ADM-OLD-${run}`),
        label: "adm-test old",
        max_uses: 1,
        used_count: 0,
        expires_at: new Date(Date.now() - 86400000).toISOString(),
        grants_status: "active",
      },
    ]);
    const list = await asAdmin(listInvites, "/invites");
    const status = (label: string) =>
      list.body.data.find((i: { label: string }) => i.label === label)?.status;
    expect(status("adm-test full")).toBe("exhausted");
    expect(status("adm-test old")).toBe("expired");
  });
});
// ---------------------------------------------------------------------------
// ADM-06 and ADM-07 verification queue
// ---------------------------------------------------------------------------
describe("ADM-06 queue and ADM-07 decision", () => {
  it("a manual request appears in the queue, with the applicant, and the college sees only its own", async () => {
    const person = await newPerson("queue");
    const membershipId = await joinByManual(person, `Q${run}001`);
    const list = await asAdmin(listQueue, "/verification-requests?status=pending", {
      params: { slug: SLUG },
    });
    expect(list.status).toBe(200);
    expectMatches(verificationRequestListResponse, list.body);
    const item = list.body.data.find(
      (r: { membership_id: string }) => r.membership_id === membershipId,
    );
    expect(item).toMatchObject({
      status: "pending",
      method: "manual",
      applicant: { user_id: person.userId, email: person.email },
    });
    expect(item.submitted).toMatchObject({ program: "B.Tech CSE", grad_year: 2028 });
    // The Beta admin sees no Alpha requests.
    const beta = await call(listQueue, {
      path: "/api/v1/c/beta/admin/verification-requests",
      cookie: cookies.other_admin,
      params: { slug: "beta" },
    });
    expect(
      beta.body.data.find((r: { membership_id: string }) => r.membership_id === membershipId),
    ).toBeUndefined();
  });

  const decideCall = (id: string, json: unknown, key = randomUUID()) =>
    asAdmin(decide, `/verification-requests/${id}/decision`, {
      method: "POST",
      json,
      params: { slug: SLUG, id },
      headers: { "idempotency-key": key },
    });

  it("approve: the person becomes an active member at level 2, one audit row, and cannot be decided twice", async () => {
    const person = await newPerson("approve");
    const membershipId = await joinByManual(person, `A${run}002`);
    const requestId = await queueIdFor(membershipId);
    const before = await auditCount();
    const result = await decideCall(requestId, { decision: "approved" });
    expect(result.status).toBe(200);
    expectMatches(verificationDecisionResponse, result.body);
    expect(result.body.data.membership).toMatchObject({ status: "active", verification_level: 2 });
    expect(result.body.data.request).toMatchObject({ id: requestId, status: "approved" });
    expect(await auditCount()).toBe(before + 1);
    const { data: audit } = await admin
      .from("audit_logs")
      .select("action, target_id")
      .eq("request_id", result.headers.get("x-request-id")!);
    expect(audit).toEqual([{ action: "member.approved", target_id: requestId }]);
    // The person is a real member now.
    const check = await admin
      .from("memberships")
      .select("status, verification_level")
      .eq("id", membershipId)
      .single();
    expect(check.data).toEqual({ status: "active", verification_level: 2 });
    // A second decision (a stale screen) is a conflict and writes nothing.
    const stale = await decideCall(requestId, {
      decision: "rejected",
      reason: "Too late to reject",
    });
    expectError(stale, 409, "CONFLICT");
    expect(await auditCount()).toBe(before + 1);
  });

  it("reject needs a reason of 5 or more characters; the reason is kept; one audit row", async () => {
    const person = await newPerson("reject");
    const membershipId = await joinByManual(person, `R${run}003`);
    const requestId = await queueIdFor(membershipId);
    const before = await auditCount();
    expectError(await decideCall(requestId, { decision: "rejected" }), 400, "VALIDATION_FAILED");
    expectError(
      await decideCall(requestId, { decision: "rejected", reason: "no" }),
      400,
      "VALIDATION_FAILED",
    );
    expect(await auditCount()).toBe(before);
    const result = await decideCall(requestId, {
      decision: "rejected",
      reason: "Enrollment number not found",
    });
    expect(result.status).toBe(200);
    expect(result.body.data.membership.status).toBe("rejected");
    const { data } = await admin
      .from("memberships")
      .select("status, status_reason")
      .eq("id", membershipId)
      .single();
    expect(data).toEqual({ status: "rejected", status_reason: "Enrollment number not found" });
    expect(await auditCount()).toBe(before + 1);
  });

  it("the same Idempotency-Key replays the first answer", async () => {
    const person = await newPerson("idem");
    const requestId = await queueIdFor(await joinByManual(person, `I${run}004`));
    const key = randomUUID();
    const first = await decideCall(requestId, { decision: "approved" }, key);
    const replay = await decideCall(requestId, { decision: "approved" }, key);
    expect(first.status).toBe(200);
    expect(replay.status).toBe(200);
    expect(replay.headers.get("idempotent-replay")).toBe("true");
    expect(replay.body.data).toEqual(first.body.data);
  });

  it("an admin cannot decide their own request (403)", async () => {
    const collegeUuid = await collegeId();
    const { data: me } = await admin
      .from("memberships")
      .select("id")
      .eq("college_id", collegeUuid)
      .eq("role", "college_admin")
      .single();
    const { data: req, error } = await admin
      .from("verification_requests")
      .insert({
        membership_id: me!.id,
        college_id: collegeUuid,
        method: "manual",
        status: "pending",
      })
      .select("id")
      .single();
    if (error) throw error;
    try {
      expectError(await decideCall(req!.id, { decision: "approved" }), 403, "FORBIDDEN");
    } finally {
      await admin.from("verification_requests").delete().eq("id", req!.id);
    }
  });

  it("404 for an unknown request and for another college's request; 400 for a bad body", async () => {
    expectError(await decideCall(someUuid, { decision: "approved" }), 404, "NOT_FOUND");
    expectError(await decideCall("not-a-uuid", { decision: "approved" }), 404, "NOT_FOUND");
    const person = await newPerson("foreign");
    const requestId = await queueIdFor(await joinByManual(person, `F${run}005`));
    const betaAdmin = await call(decide, {
      method: "POST",
      path: `/api/v1/c/beta/admin/verification-requests/${requestId}/decision`,
      json: { decision: "approved" },
      cookie: cookies.other_admin,
      params: { slug: "beta", id: requestId },
      headers: idem(),
    });
    expectError(betaAdmin, 404, "NOT_FOUND");
    expectError(await decideCall(requestId, { decision: "maybe" }), 400, "VALIDATION_FAILED");
    expectError(
      await decideCall(requestId, { decision: "approved", role: "college_admin" }),
      400,
      "VALIDATION_FAILED",
    );
  });

  it("pages through the queue with the cursor, without repeats", async () => {
    const first = await asAdmin(listQueue, "/verification-requests?limit=2", {
      params: { slug: SLUG },
    });
    expect(first.body.data).toHaveLength(2);
    const cursor = first.body.meta.next_cursor as string | null;
    if (!cursor) return; // fewer than 3 requests exist
    const second = await asAdmin(listQueue, `/verification-requests?limit=2&cursor=${cursor}`, {
      params: { slug: SLUG },
    });
    const ids = new Set([...first.body.data, ...second.body.data].map((r: { id: string }) => r.id));
    expect(ids.size).toBe(first.body.data.length + second.body.data.length);
    expectError(
      await asAdmin(listQueue, "/verification-requests?cursor=garbage", { params: { slug: SLUG } }),
      400,
      "VALIDATION_FAILED",
    );
  });
});

// ---------------------------------------------------------------------------
// ADM-08 and ADM-09 members, ADM-10 audit log
// ---------------------------------------------------------------------------
describe("ADM-08 members and ADM-09 changes", () => {
  const patch = (membershipId: string, json: unknown) =>
    asAdmin(patchMember, `/members/${membershipId}`, {
      method: "PATCH",
      json,
      params: { slug: SLUG, membershipId },
    });

  async function activeMember(prefix: string) {
    const person = await newPerson(prefix);
    const membershipId = await joinByManual(
      person,
      `${prefix.toUpperCase()}${run}${Math.floor(Math.random() * 900 + 100)}`,
    );
    await call(decide, {
      method: "POST",
      path: `${base}/verification-requests/x/decision`,
      json: { decision: "approved" },
      cookie: cookies.admin,
      params: { slug: SLUG, id: await queueIdFor(membershipId) },
      headers: idem(),
    });
    return { ...person, membershipId };
  }

  it("lists members with filters and no email addresses, and the college sees only its own", async () => {
    const result = await asAdmin(listMembers, "/members?limit=50", { params: { slug: SLUG } });
    expect(result.status).toBe(200);
    expectMatches(memberListResponse, result.body);
    expect(JSON.stringify(result.body)).not.toMatch(/@/);
    const suspended = await asAdmin(listMembers, "/members?status=suspended", {
      params: { slug: SLUG },
    });
    expect(suspended.body.data.every((m: { status: string }) => m.status === "suspended")).toBe(
      true,
    );
    const search = await asAdmin(listMembers, "/members?q=Riya", { params: { slug: SLUG } });
    expect(search.body.data).toHaveLength(1);
    const beta = await call(listMembers, {
      path: "/api/v1/c/beta/admin/members",
      cookie: cookies.other_admin,
      params: { slug: "beta" },
    });
    const alphaIds = new Set(
      result.body.data.map((m: { membership_id: string }) => m.membership_id),
    );
    expect(
      beta.body.data.some((m: { membership_id: string }) => alphaIds.has(m.membership_id)),
    ).toBe(false);
    expectError(
      await asAdmin(listMembers, "/members?role=owner", { params: { slug: SLUG } }),
      400,
      "VALIDATION_FAILED",
    );
    expectError(
      await asAdmin(listMembers, "/members?limit=500", { params: { slug: SLUG } }),
      400,
      "VALIDATION_FAILED",
    );
  });

  it("suspend (reason needed), reinstate, remove: each writes exactly one audit row", async () => {
    const member = await activeMember("mem");
    const before = await auditCount();
    expectError(
      await patch(member.membershipId, { status: "suspended" }),
      400,
      "VALIDATION_FAILED",
    );
    const suspended = await patch(member.membershipId, {
      status: "suspended",
      reason: "Repeated spam reports",
    });
    expect(suspended.status).toBe(200);
    expectMatches(memberPatchResponse, suspended.body);
    expect(suspended.body.data.member.status).toBe("suspended");
    const reinstated = await patch(member.membershipId, { status: "active" });
    expect(reinstated.body.data.member.status).toBe("active");
    const removed = await patch(member.membershipId, {
      status: "left",
      reason: "Left the college",
    });
    expect(removed.body.data.member.status).toBe("left");
    expect(await auditCount()).toBe(before + 3);
    expectError(await patch(member.membershipId, { status: "active" }), 409, "CONFLICT");
  });

  it("a suspended member loses access at once", async () => {
    const member = await activeMember("sus");
    await patch(member.membershipId, { status: "suspended", reason: "Testing the lock" });
    const result = await call(getSettings, {
      path: `${base}/settings`,
      cookie: member.cookie,
      params: { slug: SLUG },
    });
    expectError(result, 403, "MEMBERSHIP_NOT_ACTIVE");
  });

  it("change a role: promote to moderator, then to admin, and back", async () => {
    const member = await activeMember("role");
    expect((await patch(member.membershipId, { role: "moderator" })).body.data.member.role).toBe(
      "moderator",
    );
    expect(
      (await patch(member.membershipId, { role: "college_admin" })).body.data.member.role,
    ).toBe("college_admin");
    // A new admin can use the admin endpoints.
    const asNew = await call(getStats, {
      path: `${base}/stats`,
      cookie: member.cookie,
      params: { slug: SLUG },
    });
    expect(asNew.status).toBe(200);
    expect((await patch(member.membershipId, { role: "student" })).body.data.member.role).toBe(
      "student",
    );
  });

  it("the LAST admin cannot be demoted, suspended or removed (409), not even by themselves", async () => {
    const { data: admins } = await admin
      .from("memberships")
      .select("id, user_id")
      .eq("college_id", await collegeId())
      .eq("role", "college_admin")
      .eq("status", "active");
    expect(admins).toHaveLength(1);
    const lastId = admins![0]!.id;
    const before = await auditCount();
    for (const json of [
      { role: "student" },
      { status: "suspended", reason: "testing the rule" },
      { status: "left", reason: "testing the rule" },
    ]) {
      const result = await patch(lastId, json);
      expectError(result, 409, "CONFLICT");
      expect(result.body.error.message).toMatch(/at least one active admin/);
    }
    expect(await auditCount()).toBe(before);
  });

  it("with two admins nobody can change their own role or status (403)", async () => {
    const member = await activeMember("two");
    await patch(member.membershipId, { role: "college_admin" });
    const { data: me } = await admin
      .from("memberships")
      .select("id")
      .eq("college_id", await collegeId())
      .eq("user_id", userIds.admin!)
      .single();
    expectError(await patch(me!.id, { role: "student" }), 403, "FORBIDDEN");
    expectError(
      await patch(me!.id, { status: "suspended", reason: "testing the rule" }),
      403,
      "FORBIDDEN",
    );
    await patch(member.membershipId, { role: "student" });
  });

  it("404 for a member of another college; 400 for an empty change or unknown fields", async () => {
    const { data: other } = await admin
      .from("memberships")
      .select("id")
      .eq(
        "college_id",
        (await admin.from("colleges").select("id").eq("slug", "beta").single()).data!.id,
      )
      .limit(1)
      .single();
    expectError(await patch(other!.id, { role: "moderator" }), 404, "NOT_FOUND");
    expectError(await patch(someUuid, {}), 400, "VALIDATION_FAILED");
    expectError(await patch(someUuid, { verification_level: 3 }), 400, "VALIDATION_FAILED");
  });
});

describe("ADM-10 audit log", () => {
  it("lists the college's audit rows newest first, with the actor name, and nothing from another college", async () => {
    const result = await asAdmin(listAudit, "/audit-logs?limit=50", { params: { slug: SLUG } });
    expect(result.status).toBe(200);
    expectMatches(auditLogListResponse, result.body);
    expect(result.body.data.length).toBeGreaterThan(5);
    const times = result.body.data.map((r: { created_at: string }) => Date.parse(r.created_at));
    expect([...times].sort((a, b) => b - a)).toEqual(times);
    expect(
      result.body.data.some((r: { actor_name: string | null }) => r.actor_name === "Aarav Admin"),
    ).toBe(true);
    const beta = await call(listAudit, {
      path: "/api/v1/c/beta/admin/audit-logs",
      cookie: cookies.other_admin,
      params: { slug: "beta" },
    });
    const alphaIds = new Set(result.body.data.map((r: { id: string }) => r.id));
    expect(beta.body.data.some((r: { id: string }) => alphaIds.has(r.id))).toBe(false);
  });

  it("filters by action, pages with the cursor without repeats, and refuses bad input", async () => {
    const filtered = await asAdmin(listAudit, "/audit-logs?action=invite.created", {
      params: { slug: SLUG },
    });
    expect(filtered.body.data.every((r: { action: string }) => r.action === "invite.created")).toBe(
      true,
    );
    const first = await asAdmin(listAudit, "/audit-logs?limit=3", { params: { slug: SLUG } });
    expect(first.body.data).toHaveLength(3);
    const cursor = first.body.meta.next_cursor as string;
    expect(cursor).toBeTruthy();
    const second = await asAdmin(listAudit, `/audit-logs?limit=3&cursor=${cursor}`, {
      params: { slug: SLUG },
    });
    const ids = [...first.body.data, ...second.body.data].map((r: { id: string }) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    expectError(
      await asAdmin(listAudit, "/audit-logs?actor_id=nope", { params: { slug: SLUG } }),
      400,
      "VALIDATION_FAILED",
    );
    expectError(
      await asAdmin(listAudit, "/audit-logs?sort=asc", { params: { slug: SLUG } }),
      400,
      "VALIDATION_FAILED",
    );
  });

  it("an audit row cannot be changed through the API: there is no such endpoint", async () => {
    // Only GET exists on /audit-logs. The route module exports no PATCH, PUT or DELETE.
    const auditRoute = await import("@/app/api/v1/c/[slug]/admin/audit-logs/route");
    expect(Object.keys(auditRoute).sort()).toEqual(["GET"]);
  });
});
