import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  adminOpportunityListResponse,
  errorEnvelope,
  notificationListResponse,
  opportunityListResponse,
  opportunityRemoveResponse,
  opportunityResponse,
  publicCollegeResponse,
  reminderSettingsResponse,
  savedOpportunityResponse,
} from "@/contracts";
import { POST as otpRequest } from "@/app/api/v1/auth/otp/request/route";
import { POST as otpVerify } from "@/app/api/v1/auth/otp/verify/route";
import { POST as maintenance } from "@/app/api/internal/maintenance/route";
import { GET as publicCollege } from "@/app/api/v1/colleges/public/[slug]/route";
import { GET as listOpps } from "@/app/api/v1/c/[slug]/opportunities/route";
import { GET as getOpp } from "@/app/api/v1/c/[slug]/opportunities/[id]/route";
import {
  GET as adminList,
  POST as createOpp,
} from "@/app/api/v1/c/[slug]/admin/opportunities/route";
import {
  DELETE as removeOpp,
  PATCH as patchOpp,
} from "@/app/api/v1/c/[slug]/admin/opportunities/[id]/route";
import { DELETE as unsave, PUT as save } from "@/app/api/v1/me/saved-opportunities/[id]/route";
import { GET as getReminders, PUT as putReminders } from "@/app/api/v1/me/reminder-settings/route";
import { GET as myNotifications } from "@/app/api/v1/me/notifications/route";
import { adminClient } from "@/server/admin/supabase-admin";
import { call, clearInbox, clearRateLimits, expectMatches, signIn, type Result } from "./helpers";

const routes = { request: otpRequest, verify: otpVerify };
const admin = adminClient();
const SLUG = "alpha";
const run = randomUUID().slice(0, 8);
const base = `/api/v1/c/${SLUG}`;
const SECRET = "test-cron-secret-0123456789abcdef";
const idem = () => ({ "idempotency-key": randomUUID() });

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
) =>
  call(handler, {
    path,
    cookie: who ? cookies[who] : undefined,
    params: { slug: SLUG },
    ...options,
  });

const body = (title: string, extra: Record<string, unknown> = {}) => ({
  title: `opp-${run} ${title}`,
  org: "Acme Labs",
  kind: "internship",
  apply_url: "https://acme.example.org/jobs/1",
  ...extra,
});
const create = (who: Who, title: string, extra: Record<string, unknown> = {}) =>
  send(createOpp, who, `${base}/admin/opportunities`, {
    method: "POST",
    json: body(title, extra),
    headers: idem(),
  });
const list = (who: Who | undefined, query = "") =>
  send(listOpps, who, `${base}/opportunities${query}`);
const ids_ = (result: Result) => result.body.data.map((o: { id: string }) => o.id) as string[];
const detail = (who: Who | undefined, id: string) =>
  send(getOpp, who, `${base}/opportunities/${id}`, { params: { slug: SLUG, id } });
const patch = (who: Who, id: string, json: unknown) =>
  send(patchOpp, who, `${base}/admin/opportunities/${id}`, {
    method: "PATCH",
    json,
    params: { slug: SLUG, id },
  });
const saveOpp = (who: Who | undefined, id: string) =>
  send(save, who, `/api/v1/me/saved-opportunities/${id}`, { method: "PUT", params: { id } });
const unsaveOpp = (who: Who | undefined, id: string) =>
  send(unsave, who, `/api/v1/me/saved-opportunities/${id}`, { method: "DELETE", params: { id } });
const soon = (hours: number) => new Date(Date.now() + hours * 3_600_000).toISOString();

beforeAll(async () => {
  process.env.CRON_SECRET = SECRET;
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
  await admin.from("opportunities").delete().like("title", `opp-${run}%`);
  await admin.from("user_prefs").delete().in("user_id", [ids.student, ids.classmate]);
  await admin.from("reminders").delete().in("user_id", [ids.student, ids.classmate]);
  await admin.from("notifications").delete().gt("created_at", "2000-01-01");
  delete process.env.CRON_SECRET;
}, 120_000);

// ---------------------------------------------------------------------------
describe("OPP-03 curate", () => {
  it("a moderator and an admin create; the answer matches the contract; a student gets 403", async () => {
    const made = await create("moderator", "backend internship", {
      location: "Hyderabad",
      mode: "hybrid",
      skills: ["TypeScript", "PostgreSQL"],
      stipend_min: 1500000,
      stipend_max: 2500000,
      deadline: soon(240),
    });
    expect(made.status).toBe(201);
    expectMatches(opportunityResponse, made.body);
    expect(made.body.data).toMatchObject({
      status: "published",
      posted_by: "Meera Moderator",
      saved: false,
      kind: "internship",
    });
    expect((await create("admin", "created by admin")).status).toBe(201);
    expectError(await create("student", "nope"), 403, "FORBIDDEN");
    expectError(await create("pending", "nope"), 403, "MEMBERSHIP_NOT_ACTIVE");
    expectError(await create("beta_admin", "nope"), 404, "NOT_FOUND");
    expectError(
      await send(createOpp, undefined, `${base}/admin/opportunities`, {
        method: "POST",
        json: {},
        headers: idem(),
      }),
      401,
      "UNAUTHENTICATED",
    );
  });

  it("validates the input (400 with fields) and writes no audit row for refused calls", async () => {
    const count = async () =>
      (
        await admin
          .from("audit_logs")
          .select("id", { count: "exact", head: true })
          .like("action", "opportunity.%")
      ).count ?? 0;
    const before = await count();
    const bad: Record<string, unknown>[] = [
      { title: "ab" },
      { kind: "party" },
      { mode: "moon" },
      { apply_url: "http://insecure.example.org" },
      { stipend_min: 5000, stipend_max: 100 },
      { stipend_min: -1 },
      { skills: Array.from({ length: 11 }, (_, i) => `s${i}`) },
      { deadline: "tomorrow" },
      { status: "removed" },
      { admin: true },
    ];
    for (const extra of bad)
      expectError(await create("moderator", "bad", extra), 400, "VALIDATION_FAILED");
    expectError(
      await send(createOpp, "moderator", `${base}/admin/opportunities`, {
        method: "POST",
        json: body("no key"),
      }),
      400,
      "VALIDATION_FAILED",
    );
    expect(await count()).toBe(before);
  });

  it("a retry with the same Idempotency-Key creates one listing and one audit row", async () => {
    const key = randomUUID();
    const json = body("replay");
    const go = () =>
      send(createOpp, "moderator", `${base}/admin/opportunities`, {
        method: "POST",
        json,
        headers: { "idempotency-key": key },
      });
    const first = await go();
    const again = await go();
    expect(again.headers.get("idempotent-replay")).toBe("true");
    expect(again.body.data.id).toBe(first.body.data.id);
    const { count } = await admin
      .from("opportunities")
      .select("id", { count: "exact", head: true })
      .eq("title", json.title);
    expect(count).toBe(1);
    const audit = await admin
      .from("audit_logs")
      .select("action, actor_id")
      .eq("target_id", first.body.data.id);
    expect(audit.data).toEqual([{ action: "opportunity.created", actor_id: ids.moderator }]);
  });

  it("edit, verify and remove: one audit row each, 409 after removal, a student gets 403, an unknown id 404", async () => {
    const made = await create("moderator", "edit me");
    const id = made.body.data.id as string;
    await admin
      .from("opportunities")
      .update({ last_verified_at: new Date(Date.now() - 30 * 86_400_000).toISOString() })
      .eq("id", id);
    const edited = await patch("admin", id, {
      title: `opp-${run} edited`,
      stipend_max: 3000000,
      status: "draft",
    });
    expect(edited.status).toBe(200);
    expectMatches(opportunityResponse, edited.body);
    expect(edited.body.data.status).toBe("draft");
    expect(Date.parse(edited.body.data.last_verified_at)).toBeLessThan(
      Date.now() - 29 * 86_400_000,
    );
    const verified = await patch("moderator", id, { verified: true, status: "published" });
    expect(Date.parse(verified.body.data.last_verified_at)).toBeGreaterThan(Date.now() - 60_000);
    expectError(await patch("student", id, { title: "Hijacked title" }), 403, "FORBIDDEN");
    expectError(await patch("moderator", id, {}), 400, "VALIDATION_FAILED");
    expectError(await patch("moderator", id, { verified: false }), 400, "VALIDATION_FAILED");
    expectError(
      await patch("moderator", randomUUID(), { title: "Nothing here" }),
      404,
      "NOT_FOUND",
    );
    expectError(await patch("beta_admin", id, { title: "Other college" }), 404, "NOT_FOUND");

    const removed = await send(removeOpp, "moderator", `${base}/admin/opportunities/${id}`, {
      method: "DELETE",
      params: { slug: SLUG, id },
    });
    expect(removed.status).toBe(200);
    expectMatches(opportunityRemoveResponse, removed.body);
    expectError(await patch("moderator", id, { title: "Zombie listing" }), 409, "CONFLICT");
    expectError(
      await send(removeOpp, "moderator", `${base}/admin/opportunities/${id}`, {
        method: "DELETE",
        params: { slug: SLUG, id },
      }),
      409,
      "CONFLICT",
    );
    const actions = await admin.from("audit_logs").select("action").eq("target_id", id);
    expect((actions.data ?? []).map((a) => a.action).sort()).toEqual([
      "opportunity.created",
      "opportunity.removed",
      "opportunity.updated",
      "opportunity.updated",
    ]);
  });

  it("the management list shows drafts and removed ones with their stored status; students cannot open it", async () => {
    const draft = await create("moderator", "mgmt draft", { status: "draft" });
    const mine = await send(adminList, "moderator", `${base}/admin/opportunities?limit=50`);
    expect(mine.status).toBe(200);
    expectMatches(adminOpportunityListResponse, mine.body);
    expect(
      mine.body.data.find((o: { id: string }) => o.id === draft.body.data.id)?.raw_status,
    ).toBe("draft");
    const onlyDrafts = await send(
      adminList,
      "admin",
      `${base}/admin/opportunities?status=draft&limit=50`,
    );
    expect(
      onlyDrafts.body.data.every((o: { raw_status: string }) => o.raw_status === "draft"),
    ).toBe(true);
    expectError(await send(adminList, "student", `${base}/admin/opportunities`), 403, "FORBIDDEN");
    expectError(
      await send(adminList, "beta_admin", `${base}/admin/opportunities`),
      404,
      "NOT_FOUND",
    );
  });
});

// ---------------------------------------------------------------------------
describe("OPP-01 and OPP-02 browse", () => {
  it("lists published listings newest first with the contract shape; drafts are hidden from members", async () => {
    const a = await create("moderator", "browse a");
    const b = await create("moderator", "browse b");
    const draft = await create("moderator", "browse draft", { status: "draft" });
    const result = await list("student", "?limit=50");
    expect(result.status).toBe(200);
    expectMatches(opportunityListResponse, result.body);
    const seen = ids_(result);
    expect(seen).toEqual(expect.arrayContaining([a.body.data.id, b.body.data.id]));
    expect(seen).not.toContain(draft.body.data.id);
    expect(seen.indexOf(b.body.data.id)).toBeLessThan(seen.indexOf(a.body.data.id));
    expectError(await list("pending"), 403, "MEMBERSHIP_NOT_ACTIVE");
    expectError(await list("beta_student"), 404, "NOT_FOUND");
    expectError(await list(undefined), 401, "UNAUTHENTICATED");
  });

  it("filters by kind, skills, mode, location, deadline and search; unknown values are 400", async () => {
    const job = await create("moderator", "filter job", {
      kind: "job",
      mode: "remote",
      location: "Pune",
      skills: ["React"],
      deadline: soon(24 * 3),
    });
    const hack = await create("moderator", "filter hackathon", {
      kind: "hackathon",
      mode: "onsite",
      location: "Bengaluru",
      skills: ["Python"],
      deadline: soon(24 * 20),
    });
    const open = await create("moderator", "filter open ended", { kind: "scholarship" });
    const q = async (query: string) => ids_(await list("student", `${query}&limit=50`));
    expect(await q("?kind=job")).toContain(job.body.data.id);
    expect(await q("?kind=job")).not.toContain(hack.body.data.id);
    expect(await q("?kind=job,hackathon")).toEqual(
      expect.arrayContaining([job.body.data.id, hack.body.data.id]),
    );
    expect(await q("?skills=react")).toContain(job.body.data.id);
    expect(await q("?skills=react")).not.toContain(hack.body.data.id);
    expect(await q("?mode=remote")).toContain(job.body.data.id);
    expect(await q("?location=beng")).toEqual(expect.arrayContaining([hack.body.data.id]));
    expect(await q("?deadline=7d")).toContain(job.body.data.id);
    expect(await q("?deadline=7d")).not.toContain(hack.body.data.id);
    expect(await q("?deadline=30d")).toEqual(
      expect.arrayContaining([job.body.data.id, hack.body.data.id]),
    );
    expect(await q("?deadline=30d")).not.toContain(open.body.data.id);
    expect(await q(`?q=${encodeURIComponent(`opp-${run} filter hackathon`)}`)).toEqual([
      hack.body.data.id,
    ]);
    expect(await q("?q=%25")).toEqual([]);
    for (const bad of [
      "?kind=party",
      "?deadline=tomorrow",
      "?mode=moon",
      "?saved=maybe",
      "?cursor=garbage",
      "?extra=1",
      "?limit=0",
    ]) {
      expectError(await list("student", bad), 400, "VALIDATION_FAILED");
    }
  });

  it("pages with a cursor without repeating or skipping", async () => {
    for (const n of [1, 2, 3]) await create("moderator", `paging ${n}`, { kind: "competition" });
    const first = await list("student", "?kind=competition&limit=2");
    expect(first.body.data).toHaveLength(2);
    expect(first.body.meta.next_cursor).toBeTruthy();
    const second = await list(
      "student",
      `?kind=competition&limit=2&cursor=${first.body.meta.next_cursor}`,
    );
    const seen = new Set([...ids_(first), ...ids_(second)]);
    expect(seen.size).toBe(first.body.data.length + second.body.data.length);
  });

  it("detail: a member sees a listing; a draft or an unknown id is 404; another college is 404", async () => {
    const made = await create("moderator", "detail");
    const draft = await create("moderator", "detail draft", { status: "draft" });
    const result = await detail("student", made.body.data.id);
    expect(result.status).toBe(200);
    expectMatches(opportunityResponse, result.body);
    expectError(await detail("student", draft.body.data.id), 404, "NOT_FOUND");
    expectError(await detail("student", randomUUID()), 404, "NOT_FOUND");
    expectError(
      await send(getOpp, "student", `${base}/opportunities/not-a-uuid`, {
        params: { slug: SLUG, id: "not-a-uuid" },
      }),
      404,
      "NOT_FOUND",
    );
    expectError(await detail("beta_student", made.body.data.id), 404, "NOT_FOUND");
  });

  it("a listing past its deadline reads expired and is left out by deadline=hide_closed", async () => {
    const made = await create("moderator", "closed one", { deadline: soon(48) });
    await admin
      .from("opportunities")
      .update({ deadline: soon(-2) })
      .eq("id", made.body.data.id);
    expect((await detail("student", made.body.data.id)).body.data.status).toBe("expired");
    expect(ids_(await list("student", "?limit=50"))).toContain(made.body.data.id);
    expect(ids_(await list("student", "?deadline=hide_closed&limit=50"))).not.toContain(
      made.body.data.id,
    );
  });

  it("the Career tab switched off: 404 FEATURE_DISABLED for members, TEN-01 says so, and it comes back", async () => {
    const { data: college } = await admin.from("colleges").select("id").eq("slug", SLUG).single();
    const { data: settings } = await admin
      .from("college_settings")
      .select("features")
      .eq("college_id", college!.id)
      .single();
    try {
      await admin
        .from("college_settings")
        .update({ features: { ...settings!.features, career: false } })
        .eq("college_id", college!.id);
      expectError(await list("student"), 404, "FEATURE_DISABLED");
      expectError(await saveOpp("student", randomUUID()), 404, "NOT_FOUND");
      const pub = await call(publicCollege, {
        path: "/api/v1/colleges/public/alpha",
        params: { slug: SLUG },
      });
      expectMatches(publicCollegeResponse, pub.body);
      expect(pub.body.data.modules.career).toBe(false);
    } finally {
      await admin
        .from("college_settings")
        .update({ features: settings!.features })
        .eq("college_id", college!.id);
    }
    expect((await list("student")).status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
describe("OPP-04 save and unsave", () => {
  it("save, repeat, list saved, unsave; the answer matches the contract", async () => {
    const made = await create("moderator", "to save");
    const id = made.body.data.id as string;
    const saved = await saveOpp("student", id);
    expect(saved.status).toBe(200);
    expectMatches(savedOpportunityResponse, saved.body);
    expect(saved.body.data).toEqual({ saved: true, opportunity_id: id });
    expect((await saveOpp("student", id)).status).toBe(200);
    const { count } = await admin
      .from("saved_opportunities")
      .select("opportunity_id", { count: "exact", head: true })
      .eq("user_id", ids.student)
      .eq("opportunity_id", id);
    expect(count).toBe(1);
    expect((await detail("student", id)).body.data.saved).toBe(true);
    expect((await detail("classmate", id)).body.data.saved).toBe(false);
    expect(ids_(await list("student", "?saved=true&limit=50"))).toEqual([id]);
    expect(ids_(await list("classmate", "?saved=true&limit=50"))).toEqual([]);
    const gone = await unsaveOpp("student", id);
    expect(gone.body.data).toEqual({ saved: false, opportunity_id: id });
    expect((await unsaveOpp("student", id)).status).toBe(200);
    expect(ids_(await list("student", "?saved=true&limit=50"))).toEqual([]);
  });

  it("refuses drafts, unknown ids, other colleges and people not signed in", async () => {
    const draft = await create("moderator", "save draft", { status: "draft" });
    const made = await create("moderator", "save refusals");
    expectError(await saveOpp("student", draft.body.data.id), 404, "NOT_FOUND");
    expectError(await saveOpp("student", randomUUID()), 404, "NOT_FOUND");
    expectError(await saveOpp("student", "not-a-uuid"), 404, "NOT_FOUND");
    expectError(await saveOpp("beta_student", made.body.data.id), 404, "NOT_FOUND");
    expectError(await saveOpp("pending", made.body.data.id), 404, "NOT_FOUND");
    expectError(await saveOpp(undefined, made.body.data.id), 401, "UNAUTHENTICATED");
    expectError(await unsaveOpp(undefined, made.body.data.id), 401, "UNAUTHENTICATED");
  });

  it("an edit after saving shows the changed badge to the person who saved it", async () => {
    const made = await create("moderator", "changed badge");
    const id = made.body.data.id as string;
    await saveOpp("student", id);
    expect((await detail("student", id)).body.data.changed_since_saved).toBe(false);
    await new Promise((resolve) => setTimeout(resolve, 20));
    await patch("moderator", id, { eligibility: "Open to second year too" });
    expect((await detail("student", id)).body.data.changed_since_saved).toBe(true);
    expect((await detail("classmate", id)).body.data.changed_since_saved).toBe(false);
  });
});

// ---------------------------------------------------------------------------
describe("REM-01 reminders", () => {
  const runMaintenance = () =>
    call(maintenance, {
      method: "POST",
      path: "/api/internal/maintenance",
      headers: { authorization: `Bearer ${SECRET}` },
    });
  const remindersFor = async (who: Who) => {
    const result = await call(myNotifications, {
      path: "/api/v1/me/notifications?limit=50",
      cookie: cookies[who],
    });
    expectMatches(notificationListResponse, result.body);
    return result.body.data.filter(
      (n: { type: string }) => n.type === "opportunity.deadline_soon",
    ) as { payload: { opportunity_id: string; message: string } }[];
  };

  it("the setting is on by default and can be switched off and on", async () => {
    const get = () =>
      call(getReminders, { path: "/api/v1/me/reminder-settings", cookie: cookies.classmate });
    const put = (json: unknown) =>
      call(putReminders, {
        method: "PUT",
        path: "/api/v1/me/reminder-settings",
        json,
        cookie: cookies.classmate,
      });
    const first = await get();
    expectMatches(reminderSettingsResponse, first.body);
    expect(first.body.data.enabled).toBe(true);
    expect((await put({ enabled: false })).body.data.enabled).toBe(false);
    expect((await get()).body.data.enabled).toBe(false);
    expect((await put({ enabled: true })).body.data.enabled).toBe(true);
    expectError(await put({ enabled: "yes" }), 400, "VALIDATION_FAILED");
    expectError(await put({}), 400, "VALIDATION_FAILED");
    expectError(
      await call(getReminders, { path: "/api/v1/me/reminder-settings" }),
      401,
      "UNAUTHENTICATED",
    );
  });

  it("the maintenance run reminds a person once for a saved listing closing within 48 hours, and not an opted-out person", async () => {
    const closing = await create("moderator", "closing tomorrow", { deadline: soon(20) });
    const later = await create("moderator", "closing next month", { deadline: soon(24 * 30) });
    const id = closing.body.data.id as string;
    await saveOpp("student", id);
    await saveOpp("student", later.body.data.id);
    await saveOpp("classmate", id);
    await call(putReminders, {
      method: "PUT",
      path: "/api/v1/me/reminder-settings",
      json: { enabled: false },
      cookie: cookies.classmate,
    });

    const first = await runMaintenance();
    expect(first.status).toBe(200);
    expect(first.body.data.reminders_sent).toBeGreaterThanOrEqual(1);
    const mine = await remindersFor("student");
    expect(mine.filter((n) => n.payload.opportunity_id === id)).toHaveLength(1);
    expect(mine.some((n) => n.payload.opportunity_id === later.body.data.id)).toBe(false);
    expect(mine.find((n) => n.payload.opportunity_id === id)?.payload.message).toContain(
      "closing tomorrow",
    );
    expect(await remindersFor("classmate")).toHaveLength(0);

    await runMaintenance();
    expect(
      (await remindersFor("student")).filter((n) => n.payload.opportunity_id === id),
    ).toHaveLength(1);
    await call(putReminders, {
      method: "PUT",
      path: "/api/v1/me/reminder-settings",
      json: { enabled: true },
      cookie: cookies.classmate,
    });
  });

  it("the maintenance run marks listings past their deadline as expired in the table", async () => {
    const made = await create("moderator", "ends soon", { deadline: soon(48) });
    await admin
      .from("opportunities")
      .update({ deadline: soon(-1) })
      .eq("id", made.body.data.id);
    const result = await runMaintenance();
    expect(result.body.data.opportunities_expired).toBeGreaterThanOrEqual(1);
    expect(
      (await admin.from("opportunities").select("status").eq("id", made.body.data.id).single()).data
        ?.status,
    ).toBe("expired");
  });
});
