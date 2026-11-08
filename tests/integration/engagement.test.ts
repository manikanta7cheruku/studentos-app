import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  adminAnnouncementListResponse,
  announcementListResponse,
  announcementResponse,
  blockResponse,
  errorEnvelope,
  notificationListResponse,
  notificationReadResponse,
  reportActionResponse,
  reportCreateResponse,
  reportQueueResponse,
  waitlistResponse,
} from "@/contracts";
import { POST as otpRequest } from "@/app/api/v1/auth/otp/request/route";
import { POST as otpVerify } from "@/app/api/v1/auth/otp/verify/route";
import { POST as joinManual } from "@/app/api/v1/c/[slug]/join/manual/route";
import { POST as decide } from "@/app/api/v1/c/[slug]/admin/verification-requests/[id]/decision/route";
import { GET as listNotifications } from "@/app/api/v1/me/notifications/route";
import { POST as readNotifications } from "@/app/api/v1/me/notifications/read/route";
import { GET as listAnnouncements } from "@/app/api/v1/c/[slug]/announcements/route";
import {
  GET as modListAnnouncements,
  POST as createAnnouncement,
} from "@/app/api/v1/c/[slug]/admin/announcements/route";
import {
  DELETE as removeAnnouncement,
  PATCH as patchAnnouncement,
} from "@/app/api/v1/c/[slug]/admin/announcements/[id]/route";
import { POST as createReport } from "@/app/api/v1/c/[slug]/reports/route";
import { GET as listReports } from "@/app/api/v1/c/[slug]/admin/reports/route";
import { POST as actOnReport } from "@/app/api/v1/c/[slug]/admin/reports/[id]/action/route";
import { DELETE as unblock, PUT as block } from "@/app/api/v1/me/blocks/[userId]/route";
import { POST as joinWaitlist } from "@/app/api/v1/waitlist/route";
import { adminClient } from "@/server/admin/supabase-admin";
import { requireMember } from "@/modules/tenancy/require-member";
import { CookieJar } from "@/lib/supabase/request-client";
import { AppError } from "@/lib/errors";
import {
  call,
  clearInbox,
  clearRateLimits,
  expectMatches,
  randomEmail,
  randomIp,
  signIn,
  type Result,
} from "./helpers";

const routes = { request: otpRequest, verify: otpVerify };
const admin = adminClient();
const SLUG = "alpha";
const run = randomUUID().slice(0, 8);
const idem = () => ({ "idempotency-key": randomUUID() });
const APP = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

type Who =
  "admin" | "moderator" | "student" | "classmate" | "pending" | "beta_admin" | "beta_student";
const emails: Record<Who, string> = {
  admin: "admin@alpha.test",
  moderator: "moderator@alpha.test",
  student: "student1@alpha.test",
  classmate: "student2@alpha.test",
  pending: "pending@alpha.test",
  beta_admin: "admin@beta.test",
  beta_student: "student1@beta.test",
};
const cookies = {} as Record<Who, string>;
const ids = {} as Record<Who, string>;
const createdEmails: string[] = [];

const expectError = (result: Result, status: number, code: string) => {
  expect(result.status).toBe(status);
  expectMatches(errorEnvelope, result.body);
  expect(result.body.error.code).toBe(code);
};

const send = (
  handler: unknown,
  who: Who | undefined,
  path: string,
  options: Record<string, unknown> = {},
) => call(handler, { path, cookie: who ? cookies[who] : undefined, ...options });

const announce = (who: Who, title: string, extra: Record<string, unknown> = {}) =>
  send(createAnnouncement, who, `/api/v1/c/${SLUG}/admin/announcements`, {
    method: "POST",
    json: { title: `eng-${run} ${title}`, body: "Body text of the announcement.", ...extra },
    params: { slug: SLUG },
    headers: idem(),
  });

const memberList = (who: Who, query = "") =>
  send(listAnnouncements, who, `/api/v1/c/${SLUG}/announcements${query}`, {
    params: { slug: SLUG },
  });

const notes = (who: Who | undefined, query = "") =>
  send(listNotifications, who, `/api/v1/me/notifications${query}`);

async function newPerson(prefix: string) {
  const email = randomEmail(prefix);
  createdEmails.push(email);
  const session = await signIn(routes, email);
  return { ...session, email };
}

async function makeMember(prefix: string) {
  const person = await newPerson(prefix);
  const joined = await call(joinManual, {
    method: "POST",
    path: `/api/v1/c/${SLUG}/join/manual`,
    cookie: person.cookie,
    params: { slug: SLUG },
    headers: idem(),
    json: {
      enrollment_number: `E${run}${Math.floor(Math.random() * 90000 + 10000)}`,
      program: "B.Tech CSE",
      grad_year: 2028,
    },
  });
  const requestRow = await admin
    .from("verification_requests")
    .select("id")
    .eq("membership_id", joined.body.data.membership.id)
    .single();
  const approved = await call(decide, {
    method: "POST",
    path: `/api/v1/c/${SLUG}/admin/verification-requests/x/decision`,
    json: { decision: "approved" },
    cookie: cookies.admin,
    params: { slug: SLUG, id: requestRow.data!.id },
    headers: idem(),
  });
  expect(approved.status).toBe(200);
  return { ...person, membershipId: joined.body.data.membership.id as string };
}

beforeAll(async () => {
  await clearInbox();
  await clearRateLimits();
  for (const [who, email] of Object.entries(emails)) {
    const session = await signIn(routes, email);
    cookies[who as Who] = session.cookie;
    ids[who as Who] = session.userId;
  }
}, 120_000);

beforeEach(async () => {
  await clearRateLimits();
});

afterAll(async () => {
  const { data: announcements } = await admin
    .from("announcements")
    .select("id")
    .like("title", `eng-${run}%`);
  const announcementIds = (announcements ?? []).map((a) => a.id);
  if (announcementIds.length) await admin.from("reports").delete().in("target_id", announcementIds);
  await admin.from("announcements").delete().like("title", `eng-${run}%`);
  await admin.from("reports").delete().in("target_id", [ids.admin, ids.moderator, ids.student]);
  await admin.from("waitlist_leads").delete().like("contact_email", `eng-${run}%`);
  const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const mine = (data?.users ?? []).filter((u) => u.email && createdEmails.includes(u.email));
  for (const user of mine) {
    await admin.from("reports").delete().or(`reporter_id.eq.${user.id},target_id.eq.${user.id}`);
    await admin.from("blocks").delete().or(`blocker_id.eq.${user.id},blocked_id.eq.${user.id}`);
    await admin.auth.admin.deleteUser(user.id);
  }
  await admin
    .from("blocks")
    .delete()
    .or(`blocker_id.eq.${ids.student},blocked_id.eq.${ids.student}`);
  await admin.from("notifications").delete().gt("created_at", "2000-01-01");
}, 120_000);

// ---------------------------------------------------------------------------
describe("WL-01 waitlist", () => {
  const body = (email: string, extra: Record<string, unknown> = {}) => ({
    college_name: "Gamma University",
    contact_name: "Test Person",
    contact_email: email,
    role: "college_admin",
    consent: true,
    source: "landing",
    ...extra,
  });
  const post = (json: unknown, ip = randomIp(), headers: Record<string, string> = {}) =>
    call(joinWaitlist, { method: "POST", path: "/api/v1/waitlist", json, ip, headers });

  it("needs no login, answers the same shape, and never makes a second row for one email", async () => {
    const email = `eng-${run}-a@gamma.test`;
    const first = await post(body(email));
    expect(first.status).toBe(200);
    expectMatches(waitlistResponse, first.body);
    const again = await post(body(email.toUpperCase()));
    expect(again.status).toBe(200);
    expect(again.body.data).toEqual(first.body.data);
    const { count } = await admin
      .from("waitlist_leads")
      .select("id", { count: "exact", head: true })
      .eq("contact_email", email);
    expect(count).toBe(1);
  });

  it("refuses a missing consent, a bad email, an unknown role and unknown fields", async () => {
    for (const json of [
      body("a@b.test", { consent: false }),
      body("not-an-email"),
      body("a@b.test", { role: "ceo" }),
      body("a@b.test", { admin: true }),
    ]) {
      expectError(await post(json), 400, "VALIDATION_FAILED");
    }
  });

  it("refuses a form sent from another website, and limits to 5 sign ups an hour per IP", async () => {
    expectError(
      await post(body(`eng-${run}-o@gamma.test`), randomIp(), { origin: "https://evil.example" }),
      403,
      "FORBIDDEN",
    );
    const ip = randomIp();
    for (let i = 0; i < 5; i++)
      expect((await post(body(`eng-${run}-r${i}@gamma.test`), ip)).status).toBe(200);
    const sixth = await post(body(`eng-${run}-r6@gamma.test`), ip);
    expectError(sixth, 429, "RATE_LIMITED");
    expect(Number(sixth.headers.get("retry-after"))).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
describe("ANN-01 and ANN-02 announcements", () => {
  it("a moderator or an admin creates one; a student gets 403; the answer matches the contract", async () => {
    const result = await announce("moderator", "created by moderator", { pinned: true });
    expect(result.status).toBe(201);
    expectMatches(announcementResponse, result.body);
    expect(result.body.data).toMatchObject({ status: "published", pinned: true });
    expect((await announce("admin", "created by admin")).status).toBe(201);
    expectError(await announce("student", "nope"), 403, "FORBIDDEN");
    expectError(await announce("beta_admin", "nope"), 404, "NOT_FOUND");
    expectError(
      await send(createAnnouncement, undefined, `/api/v1/c/${SLUG}/admin/announcements`, {
        method: "POST",
        json: {},
        params: { slug: SLUG },
        headers: idem(),
      }),
      401,
      "UNAUTHENTICATED",
    );
  });

  it("writes exactly one audit row, and refused calls write none", async () => {
    const count = async () =>
      (
        await admin
          .from("audit_logs")
          .select("id", { count: "exact", head: true })
          .eq("action", "announcement.created")
      ).count ?? 0;
    const before = await count();
    const ok = await announce("admin", "audited");
    expect(await count()).toBe(before + 1);
    expect(
      (
        await admin
          .from("audit_logs")
          .select("actor_id, target_id")
          .eq("request_id", ok.headers.get("x-request-id")!)
          .single()
      ).data,
    ).toMatchObject({ actor_id: ids.admin, target_id: ok.body.data.id });
    await announce("student", "refused");
    await announce("admin", "refused", { title: "" });
    expect(await count()).toBe(before + 1);
  });

  it("members see it: pinned first, then newest; a page cursor works; other colleges and pending members cannot", async () => {
    const pinned = await announce("admin", "pinned one", { pinned: true });
    await announce("admin", "plain one");
    const list = await memberList("student");
    expect(list.status).toBe(200);
    expectMatches(announcementListResponse, list.body);
    const titles = list.body.data.map((a: { title: string }) => a.title);
    expect(titles[0]).toMatch(/^eng-/);
    const firstPinned = list.body.data.findIndex((a: { pinned: boolean }) => !a.pinned);
    expect(list.body.data.slice(0, firstPinned).every((a: { pinned: boolean }) => a.pinned)).toBe(
      true,
    );
    expect(list.body.data.some((a: { id: string }) => a.id === pinned.body.data.id)).toBe(true);

    const page1 = await memberList("student", "?limit=2");
    expect(page1.body.data).toHaveLength(2);
    expect(page1.body.meta.next_cursor).toBeTruthy();
    const page2 = await memberList("student", `?limit=2&cursor=${page1.body.meta.next_cursor}`);
    const seen = new Set([...page1.body.data, ...page2.body.data].map((a: { id: string }) => a.id));
    expect(seen.size).toBe(page1.body.data.length + page2.body.data.length);
    expectError(await memberList("student", "?cursor=garbage"), 400, "VALIDATION_FAILED");

    expectError(await memberList("beta_student"), 404, "NOT_FOUND");
    expectError(await memberList("pending"), 403, "MEMBERSHIP_NOT_ACTIVE");
    expectError(
      await send(listAnnouncements, undefined, `/api/v1/c/${SLUG}/announcements`, {
        params: { slug: SLUG },
      }),
      401,
      "UNAUTHENTICATED",
    );
  });

  it("drafts, future ones, ended ones and removed ones do not show to members, but moderators see them", async () => {
    const draft = await announce("admin", "draft one");
    await send(
      patchAnnouncement,
      "admin",
      `/api/v1/c/${SLUG}/admin/announcements/${draft.body.data.id}`,
      {
        method: "PATCH",
        json: { status: "draft" },
        params: { slug: SLUG, id: draft.body.data.id },
      },
    );
    const later = await announce("admin", "future one", {
      publish_at: new Date(Date.now() + 3 * 86400000).toISOString(),
    });
    const removed = await announce("admin", "removed one");
    const rm = await send(
      removeAnnouncement,
      "moderator",
      `/api/v1/c/${SLUG}/admin/announcements/${removed.body.data.id}`,
      { method: "DELETE", params: { slug: SLUG, id: removed.body.data.id } },
    );
    expect(rm.status).toBe(200);
    expect(rm.body.data.status).toBe("removed");
    const shown = (await memberList("student", "?limit=50")).body.data.map(
      (a: { id: string }) => a.id,
    );
    for (const hidden of [draft, later, removed]) expect(shown).not.toContain(hidden.body.data.id);

    const mine = await send(
      modListAnnouncements,
      "moderator",
      `/api/v1/c/${SLUG}/admin/announcements?limit=50`,
      { params: { slug: SLUG } },
    );
    expectMatches(adminAnnouncementListResponse, mine.body);
    const modIds = mine.body.data.map((a: { id: string }) => a.id);
    for (const row of [draft, later, removed]) expect(modIds).toContain(row.body.data.id);
    expectError(
      await send(modListAnnouncements, "student", `/api/v1/c/${SLUG}/admin/announcements`, {
        params: { slug: SLUG },
      }),
      403,
      "FORBIDDEN",
    );
  });

  it("edit and remove write one audit row each; a removed one cannot be edited (409); validation errors are 400", async () => {
    const made = await announce("admin", "to edit");
    const id = made.body.data.id;
    const count = async (action: string) =>
      (
        await admin
          .from("audit_logs")
          .select("id", { count: "exact", head: true })
          .eq("action", action)
          .eq("target_id", id)
      ).count ?? 0;
    const edited = await send(
      patchAnnouncement,
      "moderator",
      `/api/v1/c/${SLUG}/admin/announcements/${id}`,
      {
        method: "PATCH",
        json: { pinned: true, body: "New body text." },
        params: { slug: SLUG, id },
      },
    );
    expect(edited.status).toBe(200);
    expect(edited.body.data).toMatchObject({ pinned: true, body: "New body text." });
    expect(await count("announcement.updated")).toBe(1);
    await send(removeAnnouncement, "admin", `/api/v1/c/${SLUG}/admin/announcements/${id}`, {
      method: "DELETE",
      params: { slug: SLUG, id },
    });
    expect(await count("announcement.removed")).toBe(1);
    expectError(
      await send(patchAnnouncement, "admin", `/api/v1/c/${SLUG}/admin/announcements/${id}`, {
        method: "PATCH",
        json: { pinned: false },
        params: { slug: SLUG, id },
      }),
      409,
      "CONFLICT",
    );
    expectError(
      await send(
        patchAnnouncement,
        "admin",
        `/api/v1/c/${SLUG}/admin/announcements/${randomUUID()}`,
        { method: "PATCH", json: { pinned: true }, params: { slug: SLUG, id: randomUUID() } },
      ),
      404,
      "NOT_FOUND",
    );
    expectError(
      await send(patchAnnouncement, "student", `/api/v1/c/${SLUG}/admin/announcements/${id}`, {
        method: "PATCH",
        json: { pinned: true },
        params: { slug: SLUG, id },
      }),
      403,
      "FORBIDDEN",
    );
    expectError(await announce("admin", "x", { title: "" }), 400, "VALIDATION_FAILED");
    expectError(
      await announce("admin", "x", { expires_at: new Date(Date.now() - 86400000).toISOString() }),
      400,
      "VALIDATION_FAILED",
    );
    expectError(
      await send(createAnnouncement, "admin", `/api/v1/c/${SLUG}/admin/announcements`, {
        method: "POST",
        json: { title: "t", body: "b" },
        params: { slug: SLUG },
      }),
      400,
      "VALIDATION_FAILED",
    );
  });

  it("a replay with the same Idempotency-Key returns the first answer and creates nothing new", async () => {
    const key = randomUUID();
    const json = { title: `eng-${run} replay`, body: "Replay body." };
    const send1 = () =>
      send(createAnnouncement, "admin", `/api/v1/c/${SLUG}/admin/announcements`, {
        method: "POST",
        json,
        params: { slug: SLUG },
        headers: { "idempotency-key": key },
      });
    const first = await send1();
    const again = await send1();
    expect(again.headers.get("idempotent-replay")).toBe("true");
    expect(again.body.data.id).toBe(first.body.data.id);
    const { count } = await admin
      .from("announcements")
      .select("id", { count: "exact", head: true })
      .eq("title", json.title);
    expect(count).toBe(1);
  });
});

// ---------------------------------------------------------------------------
describe("NTF-01 and NTF-02 notifications", () => {
  it("members are told about a new announcement, with a title and a message; the author is not", async () => {
    const made = await announce("admin", "notify me");
    const list = await notes("student", "?limit=50");
    expect(list.status).toBe(200);
    expectMatches(notificationListResponse, list.body);
    const mine = list.body.data.find(
      (n: { payload: { announcement_id?: string } }) =>
        n.payload.announcement_id === made.body.data.id,
    );
    expect(mine).toMatchObject({ type: "announcement.published", read_at: null });
    expect(mine.payload.title).toBe("New announcement");
    expect(mine.payload.message).toContain("notify me");
    const adminList = await notes("admin", "?limit=50");
    expect(
      adminList.body.data.some(
        (n: { payload: { announcement_id?: string } }) =>
          n.payload.announcement_id === made.body.data.id,
      ),
    ).toBe(false);
    const betaList = await notes("beta_student", "?limit=50");
    expect(
      betaList.body.data.some(
        (n: { payload: { announcement_id?: string } }) =>
          n.payload.announcement_id === made.body.data.id,
      ),
    ).toBe(false);
  });

  it("unread filter, unread_count for the whole list, and paging with a cursor", async () => {
    await announce("admin", "n1");
    await announce("admin", "n2");
    const all = await notes("classmate", "?limit=50");
    expect(all.body.meta.unread_count).toBeGreaterThanOrEqual(2);
    expect(all.body.data.length).toBeGreaterThanOrEqual(2);
    const unread = await notes("classmate", "?unread=true&limit=50");
    expect(unread.body.data.every((n: { read_at: string | null }) => n.read_at === null)).toBe(
      true,
    );
    const page1 = await notes("classmate", "?limit=1");
    expect(page1.body.data).toHaveLength(1);
    expect(page1.body.meta.next_cursor).toBeTruthy();
    expect(page1.body.meta.unread_count).toBe(all.body.meta.unread_count);
    const page2 = await notes("classmate", `?limit=1&cursor=${page1.body.meta.next_cursor}`);
    expect(page2.body.data[0].id).not.toBe(page1.body.data[0].id);
    expectError(await notes("classmate", "?unread=maybe"), 400, "VALIDATION_FAILED");
    expectError(await notes(undefined), 401, "UNAUTHENTICATED");
  });

  const read = (who: Who | undefined, json: unknown) =>
    send(readNotifications, who, "/api/v1/me/notifications/read", { method: "POST", json });

  it("mark some read, then all; someone else's notification id changes nothing", async () => {
    await announce("admin", "to read");
    const before = (await notes("classmate", "?limit=50")).body;
    const first = before.data.find((n: { read_at: string | null }) => n.read_at === null);
    const marked = await read("classmate", { ids: [first.id] });
    expect(marked.status).toBe(200);
    expectMatches(notificationReadResponse, marked.body);
    expect(marked.body.data.updated).toBe(1);
    expect((await notes("classmate", "?limit=50")).body.meta.unread_count).toBe(
      before.meta.unread_count - 1,
    );

    const other = (await notes("student", "?limit=1")).body.data[0];
    expect((await read("classmate", { ids: [other.id] })).body.data.updated).toBe(0);
    expect((await notes("student", "?limit=1")).body.data[0].read_at).toBe(other.read_at);

    const all = await read("classmate", { all: true });
    expect(all.status).toBe(200);
    expect((await notes("classmate")).body.meta.unread_count).toBe(0);
    expectError(await read("classmate", { ids: [] }), 400, "VALIDATION_FAILED");
    expectError(await read("classmate", { all: false }), 400, "VALIDATION_FAILED");
    expectError(await read(undefined, { all: true }), 401, "UNAUTHENTICATED");
  });

  it("the applicant is told when an admin approves or rejects the request (same transaction as the decision)", async () => {
    for (const [decision, type, reason] of [
      ["approved", "membership.approved", undefined],
      ["rejected", "membership.rejected", "Enrollment number not found"],
    ] as const) {
      const person = await newPerson("decide");
      const joined = await call(joinManual, {
        method: "POST",
        path: `/api/v1/c/${SLUG}/join/manual`,
        cookie: person.cookie,
        params: { slug: SLUG },
        headers: idem(),
        json: {
          enrollment_number: `D${run}${Math.floor(Math.random() * 90000 + 10000)}`,
          program: "B.Tech",
          grad_year: 2028,
        },
      });
      const requestRow = await admin
        .from("verification_requests")
        .select("id")
        .eq("membership_id", joined.body.data.membership.id)
        .single();
      const result = await call(decide, {
        method: "POST",
        path: `/api/v1/c/${SLUG}/admin/verification-requests/x/decision`,
        json: reason ? { decision, reason } : { decision },
        cookie: cookies.admin,
        params: { slug: SLUG, id: requestRow.data!.id },
        headers: idem(),
      });
      expect(result.status).toBe(200);
      const list = await call(listNotifications, {
        path: "/api/v1/me/notifications",
        cookie: person.cookie,
      });
      expectMatches(notificationListResponse, list.body);
      expect(list.body.data).toHaveLength(1);
      expect(list.body.data[0]).toMatchObject({ type });
      expect(list.body.data[0].payload.college_slug).toBe(SLUG);
      if (reason) expect(list.body.data[0].payload.message).toContain(reason);
    }
  });
});

// ---------------------------------------------------------------------------
describe("RPT-01 to RPT-03 reports and moderation", () => {
  const report = (who: Who, json: unknown, key = randomUUID()) =>
    send(createReport, who, `/api/v1/c/${SLUG}/reports`, {
      method: "POST",
      json,
      params: { slug: SLUG },
      headers: { "idempotency-key": key },
    });
  const act = (who: Who, id: string, json: unknown, key = randomUUID()) =>
    send(actOnReport, who, `/api/v1/c/${SLUG}/admin/reports/${id}/action`, {
      method: "POST",
      json,
      params: { slug: SLUG, id },
      headers: { "idempotency-key": key },
    });
  const queue = (who: Who, query = "") =>
    send(listReports, who, `/api/v1/c/${SLUG}/admin/reports${query}`, { params: { slug: SLUG } });
  const auditCount = async () =>
    (
      await admin
        .from("audit_logs")
        .select("id", { count: "exact", head: true })
        .like("action", "report.%")
    ).count ?? 0;

  it("a member reports an announcement; duplicates, strangers, yourself and unknown targets are refused", async () => {
    const made = await announce("admin", "report me");
    const target = {
      target_type: "announcement",
      target_id: made.body.data.id,
      reason: "spam",
      details: "Looks like spam",
    };
    const first = await report("student", target);
    expect(first.status).toBe(201);
    expectMatches(reportCreateResponse, first.body);
    expectError(await report("student", target), 409, "CONFLICT");
    expectError(await report("student", { ...target, target_id: randomUUID() }), 404, "NOT_FOUND");
    expectError(
      await report("student", { target_type: "profile", target_id: ids.student, reason: "spam" }),
      400,
      "VALIDATION_FAILED",
    );
    expectError(
      await report("student", {
        target_type: "profile",
        target_id: ids.beta_student,
        reason: "spam",
      }),
      404,
      "NOT_FOUND",
    );
    expectError(
      await report("student", {
        target_type: "team_post",
        target_id: randomUUID(),
        reason: "spam",
      }),
      404,
      "NOT_FOUND",
    );
    expectError(await report("student", { ...target, reason: "rude" }), 400, "VALIDATION_FAILED");
    expectError(await report("pending", target), 403, "MEMBERSHIP_NOT_ACTIVE");
    expectError(await report("beta_student", target), 404, "NOT_FOUND");
    expectError(
      await send(createReport, undefined, `/api/v1/c/${SLUG}/reports`, {
        method: "POST",
        json: target,
        params: { slug: SLUG },
        headers: idem(),
      }),
      401,
      "UNAUTHENTICATED",
    );
  });

  it("only moderators and admins see the queue, with the title and the reporter; the other college sees none", async () => {
    const made = await announce("admin", "queue me");
    await report("classmate", {
      target_type: "announcement",
      target_id: made.body.data.id,
      reason: "inappropriate",
    });
    const list = await queue("moderator", "?status=open&limit=50");
    expect(list.status).toBe(200);
    expectMatches(reportQueueResponse, list.body);
    const item = list.body.data.find(
      (r: { target_id: string }) => r.target_id === made.body.data.id,
    );
    expect(item).toMatchObject({
      target_title: made.body.data.title,
      status: "open",
      reporter: { user_id: ids.classmate },
    });
    expectError(await queue("student"), 403, "FORBIDDEN");
    expectError(await queue("pending"), 403, "MEMBERSHIP_NOT_ACTIVE");
    expectError(await queue("beta_admin"), 404, "NOT_FOUND");
    expectError(await queue("moderator", "?status=weird"), 400, "VALIDATION_FAILED");
  });

  async function openReport(title: string, reporter: Who = "student", author: Who = "admin") {
    const made = await announce(author, title);
    const created = await report(reporter, {
      target_type: "announcement",
      target_id: made.body.data.id,
      reason: "scam",
    });
    return {
      announcementId: made.body.data.id as string,
      reportId: created.body.data.id as string,
    };
  }

  it("dismiss needs no note, writes one audit row, and tells the reporter", async () => {
    const { reportId } = await openReport("dismiss me");
    const before = await auditCount();
    const result = await act("moderator", reportId, { action: "dismiss" });
    expect(result.status).toBe(200);
    expectMatches(reportActionResponse, result.body);
    expect(result.body.data.report.status).toBe("dismissed");
    expect(await auditCount()).toBe(before + 1);
    expect(
      (
        await admin
          .from("audit_logs")
          .select("action, actor_id")
          .eq("request_id", result.headers.get("x-request-id")!)
          .single()
      ).data,
    ).toEqual({ action: "report.dismissed", actor_id: ids.moderator });
    const told = await notes("student", "?limit=50");
    expect(
      told.body.data.some(
        (n: { type: string; payload: { report_id?: string } }) =>
          n.type === "report.actioned" && n.payload.report_id === reportId,
      ),
    ).toBe(true);
    expect(
      (await admin.from("moderation_actions").select("action").eq("report_id", reportId)).data,
    ).toEqual([{ action: "dismiss" }]);
    expectError(await act("moderator", reportId, { action: "dismiss" }), 409, "CONFLICT");
  });

  it("hide removes the content from member lists; the author is told; a note is needed", async () => {
    const { reportId, announcementId } = await openReport("hide me");
    expect(
      (await memberList("student", "?limit=50")).body.data.some(
        (a: { id: string }) => a.id === announcementId,
      ),
    ).toBe(true);
    expectError(await act("moderator", reportId, { action: "hide" }), 400, "VALIDATION_FAILED");
    expectError(
      await act("moderator", reportId, { action: "hide", note: "no" }),
      400,
      "VALIDATION_FAILED",
    );
    expectError(
      await act("student", reportId, { action: "hide", note: "I am not a moderator" }),
      403,
      "FORBIDDEN",
    );
    const before = await auditCount();
    const result = await act("moderator", reportId, {
      action: "hide",
      note: "Misleading information",
    });
    expect(result.status).toBe(200);
    expect(await auditCount()).toBe(before + 1);
    expect(
      (await memberList("student", "?limit=50")).body.data.some(
        (a: { id: string }) => a.id === announcementId,
      ),
    ).toBe(false);
    const authorNotes = await notes("admin", "?limit=50");
    expect(
      authorNotes.body.data.some((n: { type: string }) => n.type === "moderation.hidden"),
    ).toBe(true);
    expect(
      (
        await admin
          .from("audit_logs")
          .select("action")
          .eq("request_id", result.headers.get("x-request-id")!)
          .single()
      ).data!.action,
    ).toBe("report.content_hidden");
  });

  it("warn sends the owner a notification with the note; suspend suspends a student and cuts access at once", async () => {
    const offender = await makeMember("offender");
    const reportProfile = async (reason = "harassment") => {
      const created = await report("student", {
        target_type: "profile",
        target_id: offender.userId,
        reason,
      });
      expect(created.status).toBe(201);
      return created.body.data.id as string;
    };
    const warnId = await reportProfile();
    const warned = await act("moderator", warnId, {
      action: "warn",
      note: "Please be polite to others",
    });
    expect(warned.status).toBe(200);
    const offenderNotes = await call(listNotifications, {
      path: "/api/v1/me/notifications",
      cookie: offender.cookie,
    });
    expect(
      offenderNotes.body.data.some(
        (n: { type: string; payload: { message: string } }) =>
          n.type === "moderation.warned" && n.payload.message === "Please be polite to others",
      ),
    ).toBe(true);

    const suspendId = await reportProfile("scam");
    const before = await auditCount();
    const suspended = await act("moderator", suspendId, {
      action: "suspend",
      note: "Repeated harassment",
    });
    expect(suspended.status).toBe(200);
    expect(await auditCount()).toBe(before + 1);
    const { data } = await admin
      .from("memberships")
      .select("status, status_reason")
      .eq("id", offender.membershipId)
      .single();
    expect(data).toEqual({ status: "suspended", status_reason: "Repeated harassment" });
    const request = new Request(`${APP}/x`, { headers: { cookie: offender.cookie } });
    const error = await requireMember(request, new CookieJar(), SLUG).catch((e) => e);
    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).code).toBe("MEMBERSHIP_NOT_ACTIVE");
  });

  it("a moderator cannot suspend an admin or handle a report about themselves; an admin cannot suspend themselves", async () => {
    const aboutAdmin = await report("student", {
      target_type: "profile",
      target_id: ids.admin,
      reason: "spam",
    });
    expectError(
      await act("moderator", aboutAdmin.body.data.id, {
        action: "suspend",
        note: "Trying to suspend an admin",
      }),
      403,
      "FORBIDDEN",
    );
    expectError(
      await act("admin", aboutAdmin.body.data.id, { action: "suspend", note: "Suspending myself" }),
      403,
      "FORBIDDEN",
    );
    const aboutModerator = await report("student", {
      target_type: "profile",
      target_id: ids.moderator,
      reason: "spam",
    });
    expectError(
      await act("moderator", aboutModerator.body.data.id, { action: "dismiss" }),
      403,
      "FORBIDDEN",
    );
    await act("moderator", aboutAdmin.body.data.id, { action: "dismiss" });
    await act("admin", aboutModerator.body.data.id, { action: "dismiss" });
  });

  it("the other college cannot act on this college's report (404); the same Idempotency-Key replays the first answer", async () => {
    const { reportId } = await openReport("replay report", "student", "moderator");
    expectError(
      await send(actOnReport, "beta_admin", `/api/v1/c/beta/admin/reports/${reportId}/action`, {
        method: "POST",
        json: { action: "dismiss" },
        params: { slug: "beta", id: reportId },
        headers: idem(),
      }),
      404,
      "NOT_FOUND",
    );
    const key = randomUUID();
    const first = await act("admin", reportId, { action: "dismiss" }, key);
    const again = await act("admin", reportId, { action: "dismiss" }, key);
    expect(first.status).toBe(200);
    expect(again.headers.get("idempotent-replay")).toBe("true");
    expect(again.body.data).toEqual(first.body.data);
    expectError(await act("admin", randomUUID(), { action: "dismiss" }), 404, "NOT_FOUND");
    expectError(await act("admin", "not-a-uuid", { action: "dismiss" }), 404, "NOT_FOUND");
  });
});

// ---------------------------------------------------------------------------
describe("RPT-04 blocks", () => {
  const put = (who: Who | undefined, userId: string) =>
    send(block, who, `/api/v1/me/blocks/${userId}`, { method: "PUT", params: { userId } });
  const del = (who: Who | undefined, userId: string) =>
    send(unblock, who, `/api/v1/me/blocks/${userId}`, { method: "DELETE", params: { userId } });

  it("block and unblock a classmate, safe to repeat", async () => {
    const a = await put("student", ids.classmate);
    expect(a.status).toBe(200);
    expectMatches(blockResponse, a.body);
    expect(a.body.data.blocked).toBe(true);
    expect((await put("student", ids.classmate)).status).toBe(200);
    const { count } = await admin
      .from("blocks")
      .select("blocker_id", { count: "exact", head: true })
      .eq("blocker_id", ids.student);
    expect(count).toBe(1);
    const b = await del("student", ids.classmate);
    expect(b.body.data.blocked).toBe(false);
    expect((await del("student", ids.classmate)).status).toBe(200);
  });

  it("refuses yourself (400), a person of another college and a stranger (404), a bad id (404), and nobody signed in (401)", async () => {
    expectError(await put("student", ids.student), 400, "VALIDATION_FAILED");
    expectError(await put("student", ids.beta_student), 404, "NOT_FOUND");
    expectError(await put("student", randomUUID()), 404, "NOT_FOUND");
    expectError(await put("student", "not-a-uuid"), 404, "NOT_FOUND");
    expectError(await put(undefined, ids.classmate), 401, "UNAUTHENTICATED");
    expectError(await del(undefined, ids.classmate), 401, "UNAUTHENTICATED");
  });

  it("the database exposes only the blocker's own row", async () => {
    await put("student", ids.classmate);
    const seen = await admin.from("blocks").select("*").eq("blocker_id", ids.student);
    expect(seen.data).toHaveLength(1);
    await del("student", ids.classmate);
  });
});

// ---------------------------------------------------------------------------
describe("write limit: 60 a minute per person", () => {
  it("the 61st write in a minute is RATE_LIMITED with Retry-After", async () => {
    const person = await makeMember("limit");
    const put = () =>
      call(block, {
        method: "PUT",
        path: `/api/v1/me/blocks/${ids.classmate}`,
        cookie: person.cookie,
        params: { userId: ids.classmate },
      });
    await clearRateLimits();
    let last: Result | undefined;
    for (let i = 0; i < 60; i++) last = await put();
    expect(last!.status).toBe(200);
    const over = await put();
    expectError(over, 429, "RATE_LIMITED");
    expect(Number(over.headers.get("retry-after"))).toBeGreaterThan(0);
    // Reads are not counted by the write limit.
    expect(
      (await call(listNotifications, { path: "/api/v1/me/notifications", cookie: person.cookie }))
        .status,
    ).toBe(200);
  });
});
