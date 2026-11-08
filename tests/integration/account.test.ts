import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  deleteMeResponse,
  errorEnvelope,
  leaveResponse,
  myMembershipsResponse,
  personProfileResponse,
} from "@/contracts";
import { POST as otpRequest } from "@/app/api/v1/auth/otp/request/route";
import { POST as otpVerify } from "@/app/api/v1/auth/otp/verify/route";
import { DELETE as deleteMe } from "@/app/api/v1/me/route";
import { GET as myMemberships } from "@/app/api/v1/me/memberships/route";
import { POST as joinManual } from "@/app/api/v1/c/[slug]/join/manual/route";
import { POST as leave } from "@/app/api/v1/c/[slug]/me/leave/route";
import { GET as myMembership } from "@/app/api/v1/c/[slug]/me/membership/route";
import { GET as person } from "@/app/api/v1/c/[slug]/people/[userId]/route";
import { GET as people } from "@/app/api/v1/c/[slug]/people/route";
import { POST as decide } from "@/app/api/v1/c/[slug]/admin/verification-requests/[id]/decision/route";
import { GET as listPosts, POST as createPost } from "@/app/api/v1/c/[slug]/team-posts/route";
import { POST as requestRole } from "@/app/api/v1/c/[slug]/team-posts/[id]/roles/[roleId]/requests/route";
import { POST as decideRequest } from "@/app/api/v1/c/[slug]/join-requests/[id]/decision/route";
import { GET as getPost } from "@/app/api/v1/c/[slug]/team-posts/[id]/route";
import { GET as myNotifications } from "@/app/api/v1/me/notifications/route";
import { PUT as block, DELETE as unblock } from "@/app/api/v1/me/blocks/[userId]/route";
import { adminClient } from "@/server/admin/supabase-admin";
import {
  call,
  clearInbox,
  clearRateLimits,
  expectMatches,
  latestCode,
  randomEmail,
  signIn,
  waitForMailCooldown,
  type Result,
} from "./helpers";

const routes = { request: otpRequest, verify: otpVerify };
const admin = adminClient();
const SLUG = "alpha";
const run = randomUUID().slice(0, 8);
const idem = () => ({ "idempotency-key": randomUUID() });
const base = `/api/v1/c/${SLUG}`;
const cookies: Record<string, string> = {};
const ids: Record<string, string> = {};
const created: string[] = [];

const expectError = (result: Result, status: number, code: string) => {
  expect(result.status).toBe(status);
  expectMatches(errorEnvelope, result.body);
  expect(result.body.error.code).toBe(code);
};

async function newMember(prefix: string, approve = true) {
  const email = randomEmail(prefix);
  created.push(email);
  const session = await signIn(routes, email);
  const joined = await call(joinManual, {
    method: "POST",
    path: `${base}/join/manual`,
    cookie: session.cookie,
    params: { slug: SLUG },
    headers: idem(),
    json: {
      enrollment_number: `A${run}${Math.floor(Math.random() * 90000 + 10000)}`,
      program: "B.Tech CSE",
      grad_year: 2028,
    },
  });
  expect(joined.status).toBe(200);
  const membershipId = joined.body.data.membership.id as string;
  if (approve) {
    const row = await admin
      .from("verification_requests")
      .select("id")
      .eq("membership_id", membershipId)
      .single();
    const decided = await call(decide, {
      method: "POST",
      path: `${base}/admin/verification-requests/x/decision`,
      json: { decision: "approved" },
      cookie: cookies.admin,
      params: { slug: SLUG, id: row.data!.id },
      headers: idem(),
    });
    expect(decided.status).toBe(200);
  }
  return { ...session, email, membershipId };
}

beforeAll(async () => {
  await clearInbox();
  await clearRateLimits();
  for (const [who, email] of Object.entries({
    admin: "admin@alpha.test",
    suspended: "suspended@alpha.test",
    student: "student1@alpha.test",
    beta: "student1@beta.test",
  })) {
    const session = await signIn(routes, email);
    cookies[who] = session.cookie;
    ids[who] = session.userId;
  }
}, 120_000);

beforeEach(async () => {
  await clearRateLimits();
});

afterAll(async () => {
  await admin.from("team_posts").delete().like("title", `acct-${run}%`);
  const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  for (const user of (data?.users ?? []).filter((u) => u.email && created.includes(u.email))) {
    await admin.auth.admin.deleteUser(user.id);
  }
  await admin
    .from("blocks")
    .delete()
    .or(`blocker_id.eq.${ids.student},blocked_id.eq.${ids.student}`);
  await admin.from("notifications").delete().gt("created_at", "2000-01-01");
}, 120_000);

// ---------------------------------------------------------------------------
describe("PRF-06 one classmate", () => {
  const view = (who: string, userId: string, slug = SLUG) =>
    call(person, {
      path: `/api/v1/c/${slug}/people/${userId}`,
      params: { slug, userId },
      cookie: cookies[who],
    });

  it("a member sees a classmate with program, year and skills, without an email address", async () => {
    const other = await newMember("viewed");
    const result = await view("student", other.userId);
    expect(result.status).toBe(200);
    expectMatches(personProfileResponse, result.body);
    expect(result.body.data).toMatchObject({
      user_id: other.userId,
      program: "B.Tech CSE",
      grad_year: 2028,
      is_self: false,
    });
    expect(JSON.stringify(result.body)).not.toContain("@");
    expect((await view("student", ids.student!)).body.data.is_self).toBe(true);
  });

  it("hidden by the person, hidden by a moderator, blocked, left or in another college: 404", async () => {
    const other = await newMember("hidden");
    const target = other.userId;
    await admin.from("profiles").update({ visibility: "hidden" }).eq("user_id", target);
    expectError(await view("student", target), 404, "NOT_FOUND");
    await admin.from("profiles").update({ visibility: "college" }).eq("user_id", target);
    await admin
      .from("memberships")
      .update({ profile_hidden_at: new Date().toISOString() })
      .eq("user_id", target);
    expectError(await view("student", target), 404, "NOT_FOUND");
    await admin.from("memberships").update({ profile_hidden_at: null }).eq("user_id", target);
    expect((await view("student", target)).status).toBe(200);

    await call(block, {
      method: "PUT",
      path: `/api/v1/me/blocks/${target}`,
      params: { userId: target },
      cookie: cookies.student,
    });
    expectError(await view("student", target), 404, "NOT_FOUND");
    await call(unblock, {
      method: "DELETE",
      path: `/api/v1/me/blocks/${target}`,
      params: { userId: target },
      cookie: cookies.student,
    });

    expectError(await view("student", ids.beta!), 404, "NOT_FOUND");
    expectError(await view("beta", target), 404, "NOT_FOUND");
    expectError(await view("student", randomUUID()), 404, "NOT_FOUND");
    expectError(await view("student", "not-a-uuid"), 404, "NOT_FOUND");
  });

  it("the directory and the profile agree: someone who left is in neither", async () => {
    const other = await newMember("gone");
    const listed = async () => {
      const result = await call(people, {
        path: `${base}/people?limit=50`,
        params: { slug: SLUG },
        cookie: cookies.student,
      });
      return (result.body.data as { user_id: string }[]).map((p) => p.user_id);
    };
    expect(await listed()).toContain(other.userId);
    await call(leave, {
      method: "POST",
      path: `${base}/me/leave`,
      params: { slug: SLUG },
      cookie: other.cookie,
    });
    expect(await listed()).not.toContain(other.userId);
    expectError(await view("student", other.userId), 404, "NOT_FOUND");
  });
});

// ---------------------------------------------------------------------------
describe("TEN-07 leave a college", () => {
  const leaveNow = (cookie: string | undefined, slug = SLUG) =>
    call(leave, { method: "POST", path: `/api/v1/c/${slug}/me/leave`, params: { slug }, cookie });

  it("an active member leaves; seats, requests and posts are cleaned up; they can join again", async () => {
    const leaver = await newMember("leaver");
    const owner = await newMember("owner");
    const roles = [{ role_name: "Only role", slots: 1, skill_ids: [] }];
    const mk = (cookie: string, title: string) =>
      call(createPost, {
        method: "POST",
        path: `${base}/team-posts`,
        cookie,
        params: { slug: SLUG },
        headers: idem(),
        json: { kind: "project", title: `acct-${run} ${title}`, roles },
      });
    const mine = await mk(leaver.cookie, "post of the leaver");
    const theirs = await mk(owner.cookie, "post with the leaver seated");
    const role = theirs.body.data.roles[0].id as string;
    const asked = await call(requestRole, {
      method: "POST",
      path: `${base}/team-posts/${theirs.body.data.id}/roles/${role}/requests`,
      cookie: leaver.cookie,
      params: { slug: SLUG, id: theirs.body.data.id, roleId: role },
      headers: idem(),
      json: { message: "hi" },
    });
    await call(decideRequest, {
      method: "POST",
      path: `${base}/join-requests/${asked.body.data.id}/decision`,
      cookie: owner.cookie,
      params: { slug: SLUG, id: asked.body.data.id },
      headers: idem(),
      json: { decision: "accepted" },
    });
    const full = await call(getPost, {
      path: `${base}/team-posts/${theirs.body.data.id}`,
      cookie: owner.cookie,
      params: { slug: SLUG, id: theirs.body.data.id },
    });
    expect(full.body.data.status).toBe("filled");

    const result = await leaveNow(leaver.cookie);
    expect(result.status).toBe(200);
    expectMatches(leaveResponse, result.body);
    expect(result.body.data.membership.status).toBe("left");

    const after = await call(getPost, {
      path: `${base}/team-posts/${theirs.body.data.id}`,
      cookie: owner.cookie,
      params: { slug: SLUG, id: theirs.body.data.id },
    });
    expect(after.body.data.status).toBe("open");
    expect(after.body.data.roles[0].filled).toBe(0);
    const closed = await admin
      .from("team_posts")
      .select("status")
      .eq("id", mine.body.data.id)
      .single();
    expect(closed.data?.status).toBe("closed");
    const audit = await admin
      .from("audit_logs")
      .select("action, actor_id")
      .eq("request_id", result.headers.get("x-request-id")!);
    expect((audit.data ?? []).map((a) => a.action).sort()).toEqual([
      "member.left",
      "team.accepted_member_withdrew",
    ]);

    expectError(
      await call(listPosts, {
        path: `${base}/team-posts`,
        cookie: leaver.cookie,
        params: { slug: SLUG },
      }),
      403,
      "MEMBERSHIP_NOT_ACTIVE",
    );
    const mem = await call(myMembership, {
      path: `${base}/me/membership`,
      params: { slug: SLUG },
      cookie: leaver.cookie,
    });
    expect(mem.body.data.membership.status).toBe("left");
    expectError(await leaveNow(leaver.cookie), 409, "CONFLICT");

    // they can ask to join again (a new request, waiting for approval)
    const again = await call(joinManual, {
      method: "POST",
      path: `${base}/join/manual`,
      cookie: leaver.cookie,
      params: { slug: SLUG },
      headers: idem(),
      json: {
        enrollment_number: `B${run}${Math.floor(Math.random() * 90000 + 10000)}`,
        program: "B.Tech CSE",
        grad_year: 2028,
      },
    });
    expect(again.status).toBe(200);
    expect(again.body.data.membership.status).toBe("pending");
  });

  it("a person waiting for approval can cancel by leaving", async () => {
    const waiting = await newMember("waiting", false);
    const result = await leaveNow(waiting.cookie);
    expect(result.status).toBe(200);
    const { data } = await admin
      .from("verification_requests")
      .select("status")
      .eq("membership_id", waiting.membershipId)
      .single();
    expect(data?.status).toBe("cancelled");
  });

  it("refuses: a suspended member (403), the only admin (409), a college never joined (404), nobody signed in (401)", async () => {
    expectError(await leaveNow(cookies.suspended), 403, "FORBIDDEN");
    expectError(await leaveNow(cookies.admin), 409, "CONFLICT");
    const { data } = await admin
      .from("memberships")
      .select("status")
      .eq("user_id", ids.admin!)
      .eq(
        "college_id",
        (await admin.from("colleges").select("id").eq("slug", SLUG).single()).data!.id,
      )
      .single();
    expect(data?.status).toBe("active");
    expectError(await leaveNow(cookies.student, "beta"), 404, "NOT_FOUND");
    expectError(await leaveNow(undefined), 401, "UNAUTHENTICATED");
  });
});

// ---------------------------------------------------------------------------
describe("AUTH-04 delete my account", () => {
  const del = (cookie: string | undefined, json: unknown = {}) =>
    call(deleteMe, { method: "DELETE", path: "/api/v1/me", json, cookie });

  it("step 1 emails a code, a wrong code is refused, step 2 deletes everything and ends the session", async () => {
    const victim = await newMember("delete-me");
    const owner = await newMember("delete-owner");
    const post = await call(createPost, {
      method: "POST",
      path: `${base}/team-posts`,
      cookie: victim.cookie,
      params: { slug: SLUG },
      headers: idem(),
      json: {
        kind: "project",
        title: `acct-${run} post of a deleted person`,
        roles: [{ role_name: "Role", slots: 1, skill_ids: [] }],
      },
    });
    expect(post.status).toBe(201);
    await call(block, {
      method: "PUT",
      path: `/api/v1/me/blocks/${owner.userId}`,
      params: { userId: owner.userId },
      cookie: victim.cookie,
    });

    await waitForMailCooldown(victim.email);
    const step1 = await del(victim.cookie);
    expect(step1.status).toBe(200);
    expectMatches(deleteMeResponse, step1.body);
    expect(step1.body.data).toEqual({ deletion_requested: true, confirmation: "otp" });
    expect((await admin.auth.admin.getUserById(victim.userId)).data.user).not.toBeNull();

    expectError(await del(victim.cookie, { code: "000000" }), 400, "OTP_INVALID");
    expectError(await del(victim.cookie, { code: "12" }), 400, "VALIDATION_FAILED");
    expectError(await del(victim.cookie, { extra: true }), 400, "VALIDATION_FAILED");

    const code = await latestCode(victim.email);
    const step2 = await del(victim.cookie, { code });
    expect(step2.status).toBe(200);
    expectMatches(deleteMeResponse, step2.body);
    expect(step2.body.data).toEqual({ deleted: true });

    // the account, the profile, the memberships, the post and the block are gone
    expect((await admin.auth.admin.getUserById(victim.userId)).data.user).toBeNull();
    expect(
      (await admin.from("profiles").select("user_id").eq("user_id", victim.userId)).data,
    ).toEqual([]);
    expect(
      (await admin.from("memberships").select("id").eq("user_id", victim.userId)).data,
    ).toEqual([]);
    expect(
      (await admin.from("team_posts").select("id").eq("author_id", victim.userId)).data,
    ).toEqual([]);
    expect(
      (await admin.from("blocks").select("blocker_id").eq("blocker_id", victim.userId)).data,
    ).toEqual([]);
    // the session no longer works
    expectError(
      await call(myNotifications, { path: "/api/v1/me/notifications", cookie: victim.cookie }),
      401,
      "UNAUTHENTICATED",
    );
    // one audit row remains, with the id only
    const audit = await admin
      .from("audit_logs")
      .select("action, actor_id, metadata")
      .eq("request_id", step2.headers.get("x-request-id")!);
    expect(audit.data).toEqual([
      {
        action: "account.deleted",
        actor_id: victim.userId,
        metadata: { membership_status: "active" },
      },
    ]);
    expect(JSON.stringify(audit.data)).not.toContain(victim.email);
  });

  it("the only admin of a college is refused with the college name, and nothing is sent or deleted", async () => {
    const result = await del(cookies.admin);
    expectError(result, 409, "CONFLICT");
    expect(result.body.error.message).toContain("Alpha College");
    expect((await admin.auth.admin.getUserById(ids.admin!)).data.user).not.toBeNull();
  });

  it("refuses nobody signed in (401) and a call from another website (403)", async () => {
    expectError(await del(undefined), 401, "UNAUTHENTICATED");
    expectError(
      await call(deleteMe, {
        method: "DELETE",
        path: "/api/v1/me",
        json: {},
        cookie: cookies.student,
        headers: { origin: "https://evil.example" },
      }),
      403,
      "FORBIDDEN",
    );
  });

  it("a person with no college can delete the account too", async () => {
    const email = randomEmail("no-college");
    created.push(email);
    const session = await signIn(routes, email);
    await waitForMailCooldown(email);
    expect((await del(session.cookie)).status).toBe(200);
    const code = await latestCode(email);
    expect((await del(session.cookie, { code })).body.data).toEqual({ deleted: true });
    expect((await admin.auth.admin.getUserById(session.userId)).data.user).toBeNull();
  });
});

// ---------------------------------------------------------------------------
describe("TEN-08 my colleges", () => {
  const mine = (cookie: string | undefined) =>
    call(myMemberships, { path: "/api/v1/me/memberships", cookie });

  it("lists only my own colleges with their branding, any status, and nothing of other people", async () => {
    const waiting = await newMember("memberships", false);
    const result = await mine(waiting.cookie);
    expect(result.status).toBe(200);
    expectMatches(myMembershipsResponse, result.body);
    expect(result.body.data).toHaveLength(1);
    expect(result.body.data[0]).toMatchObject({
      college: { slug: SLUG, name: "Alpha College" },
      membership: { status: "pending", role: "student" },
    });
    // an admin sees only their own row, not every member of the college
    const asAdmin = await mine(cookies.admin);
    expect(asAdmin.body.data).toHaveLength(1);
    expect(asAdmin.body.data[0].membership.role).toBe("college_admin");
    // a person with no college gets an empty list
    const email = randomEmail("no-college-list");
    created.push(email);
    const loner = await signIn(routes, email);
    expect((await mine(loner.cookie)).body.data).toEqual([]);
    expectError(await mine(undefined), 401, "UNAUTHENTICATED");
  });
});
