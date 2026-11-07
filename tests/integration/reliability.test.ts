import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { POST as otpRequest } from "@/app/api/v1/auth/otp/request/route";
import { POST as otpVerify } from "@/app/api/v1/auth/otp/verify/route";
import { POST as maintenance } from "@/app/api/internal/maintenance/route";
import { POST as joinManual } from "@/app/api/v1/c/[slug]/join/manual/route";
import { POST as createAnnouncement } from "@/app/api/v1/c/[slug]/admin/announcements/route";
import { GET as listPosts, POST as createPost } from "@/app/api/v1/c/[slug]/team-posts/route";
import { GET as publicCollege } from "@/app/api/v1/colleges/public/[slug]/route";
import { publicCollegeResponse } from "@/contracts";
import { GET as getPost } from "@/app/api/v1/c/[slug]/team-posts/[id]/route";
import { POST as requestRole } from "@/app/api/v1/c/[slug]/team-posts/[id]/roles/[roleId]/requests/route";
import { POST as decide } from "@/app/api/v1/c/[slug]/join-requests/[id]/decision/route";
import { DELETE as withdraw } from "@/app/api/v1/c/[slug]/join-requests/[id]/route";
import { GET as myNotifications } from "@/app/api/v1/me/notifications/route";
import { adminClient } from "@/server/admin/supabase-admin";
import { call, clearInbox, clearRateLimits, expectMatches, randomEmail, signIn } from "./helpers";

const routes = { request: otpRequest, verify: otpVerify };
const admin = adminClient();
const SLUG = "alpha";
const run = randomUUID().slice(0, 8);
const SECRET = "test-cron-secret-0123456789abcdef";
const base = `/api/v1/c/${SLUG}`;
const cookies: Record<string, string> = {};
const ids: Record<string, string> = {};
const createdEmails: string[] = [];

const runMaintenance = (headers: Record<string, string> = { authorization: `Bearer ${SECRET}` }) =>
  call(maintenance, { method: "POST", path: "/api/internal/maintenance", headers });

beforeAll(async () => {
  process.env.CRON_SECRET = SECRET;
  await clearInbox();
  await clearRateLimits();
  for (const [who, email] of Object.entries({
    admin: "admin@alpha.test",
    owner: "student3@alpha.test",
    applicant: "student1@alpha.test",
    applicant2: "student2@alpha.test",
  })) {
    const session = await signIn(routes, email);
    cookies[who] = session.cookie;
    ids[who] = session.userId;
  }
}, 120_000);

beforeEach(async () => {
  await clearRateLimits();
  await admin.from("team_posts").delete().like("title", `rel-${run}%`);
});

afterAll(async () => {
  await admin.from("team_posts").delete().like("title", `rel-${run}%`);
  await admin.from("announcements").delete().like("title", `rel-${run}%`);
  const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  for (const user of (data?.users ?? []).filter(
    (u) => u.email && createdEmails.includes(u.email),
  )) {
    await admin.auth.admin.deleteUser(user.id);
  }
  await admin.from("notifications").delete().gt("created_at", "2000-01-01");
  delete process.env.CRON_SECRET;
}, 120_000);

// ---------------------------------------------------------------------------
describe("SYS-02 maintenance endpoint", () => {
  it("refuses everyone without the secret: nobody, a wrong secret, a person with a session", async () => {
    for (const headers of <Record<string, string>[]>[
      {},
      { authorization: "Bearer wrong-secret-wrong-secret-0000" },
      { authorization: "Bearer " },
    ]) {
      const result = await runMaintenance(headers);
      expect(result.status).toBe(401);
      expect(result.body.error.code).toBe("UNAUTHENTICATED");
    }
    const asAdmin = await call(maintenance, {
      method: "POST",
      path: "/api/internal/maintenance",
      cookie: cookies.admin,
    });
    expect(asAdmin.status).toBe(401);
  });

  it("is closed when CRON_SECRET is not set, even for an empty bearer", async () => {
    delete process.env.CRON_SECRET;
    expect((await runMaintenance({ authorization: "Bearer " })).status).toBe(401);
    expect((await runMaintenance({ authorization: `Bearer ${SECRET}` })).status).toBe(401);
    process.env.CRON_SECRET = SECRET;
  });

  it("with the secret it answers the counts, and a second run changes nothing", async () => {
    const first = await runMaintenance();
    expect(first.status).toBe(200);
    expect(Object.keys(first.body.data).sort()).toEqual([
      "idempotency_keys_deleted",
      "join_requests_expired",
      "notifications_deleted",
      "rate_limit_events_deleted",
      "team_posts_expired",
      "team_requests_cancelled",
      "waitlist_deleted",
    ]);
    const second = await runMaintenance();
    expect(second.body.data.team_posts_expired).toBe(0);
    expect(second.body.data.join_requests_expired).toBe(0);
  });
});

// ---------------------------------------------------------------------------
describe("expiry", () => {
  const roles = [{ role_name: "Backend developer", slots: 1, skill_ids: [] }];
  const idem = () => ({ "idempotency-key": randomUUID() });

  it("a team post past its deadline: shown as expired at once, marked and cleaned by the maintenance, people told", async () => {
    const made = await call(createPost, {
      method: "POST",
      path: `${base}/team-posts`,
      cookie: cookies.owner,
      params: { slug: SLUG },
      headers: idem(),
      json: {
        kind: "project",
        title: `rel-${run} will expire`,
        deadline: new Date(Date.now() + 86_400_000).toISOString(),
        roles,
      },
    });
    expect(made.status).toBe(201);
    const id = made.body.data.id as string;
    const role = made.body.data.roles[0].id as string;
    const asked = await call(requestRole, {
      method: "POST",
      path: `${base}/team-posts/${id}/roles/${role}/requests`,
      cookie: cookies.applicant,
      params: { slug: SLUG, id, roleId: role },
      headers: idem(),
      json: { message: "me" },
    });
    expect(asked.status).toBe(201);

    await admin
      .from("team_posts")
      .update({ deadline: new Date(Date.now() - 3_600_000).toISOString() })
      .eq("id", id);
    const before = await call(getPost, {
      path: `${base}/team-posts/${id}`,
      cookie: cookies.owner,
      params: { slug: SLUG, id },
    });
    expect(before.body.data.status).toBe("expired");
    expect(
      (await admin.from("team_posts").select("status").eq("id", id).single()).data?.status,
    ).toBe("open");

    const result = await runMaintenance();
    expect(result.body.data.team_posts_expired).toBeGreaterThanOrEqual(1);
    expect(
      (await admin.from("team_posts").select("status").eq("id", id).single()).data?.status,
    ).toBe("expired");
    expect(
      (await admin.from("join_requests").select("status").eq("id", asked.body.data.id).single())
        .data?.status,
    ).toBe("cancelled");

    const applicantNotes = await call(myNotifications, {
      path: "/api/v1/me/notifications?limit=50",
      cookie: cookies.applicant,
    });
    expect(
      applicantNotes.body.data.some(
        (n: { type: string; payload: { post_id?: string } }) =>
          n.type === "team.request_cancelled" && n.payload.post_id === id,
      ),
    ).toBe(true);
    const ownerNotes = await call(myNotifications, {
      path: "/api/v1/me/notifications?limit=50",
      cookie: cookies.owner,
    });
    expect(
      ownerNotes.body.data.some(
        (n: { type: string; payload: { post_id?: string } }) =>
          n.type === "team.post_expired" && n.payload.post_id === id,
      ),
    ).toBe(true);

    const list = await call(listPosts, {
      path: `${base}/team-posts?status=expired&limit=50`,
      cookie: cookies.applicant2,
      params: { slug: SLUG },
    });
    expect(list.body.data.map((p: { id: string }) => p.id)).toContain(id);
  });

  it("a join request nobody decided in 30 days expires, the person is told and can apply again", async () => {
    const email = randomEmail("expire");
    createdEmails.push(email);
    const person = await signIn(routes, email);
    const join = () =>
      call(joinManual, {
        method: "POST",
        path: `${base}/join/manual`,
        cookie: person.cookie,
        params: { slug: SLUG },
        headers: idem(),
        json: {
          enrollment_number: `X${run}${Math.floor(Math.random() * 90000 + 10000)}`,
          program: "B.Tech",
          grad_year: 2028,
        },
      });
    const first = await join();
    expect(first.status).toBe(200);
    expect((await join()).status).toBe(409);

    const membershipId = first.body.data.membership.id as string;
    await admin
      .from("verification_requests")
      .update({ created_at: new Date(Date.now() - 31 * 86_400_000).toISOString() })
      .eq("membership_id", membershipId);
    const result = await runMaintenance();
    expect(result.body.data.join_requests_expired).toBeGreaterThanOrEqual(1);
    expect(
      (await admin.from("memberships").select("status").eq("id", membershipId).single()).data
        ?.status,
    ).toBe("left");
    const notes = await call(myNotifications, {
      path: "/api/v1/me/notifications",
      cookie: person.cookie,
    });
    expect(notes.body.data.some((n: { type: string }) => n.type === "membership.expired")).toBe(
      true,
    );

    const again = await join();
    expect(again.status).toBe(200);
    expect(again.body.data.membership.status).toBe("pending");
  });
});

// ---------------------------------------------------------------------------
describe("safe retries (Idempotency-Key)", () => {
  const announce = (key: string, title: string) =>
    call(createAnnouncement, {
      method: "POST",
      path: `${base}/admin/announcements`,
      cookie: cookies.admin,
      params: { slug: SLUG },
      headers: { "idempotency-key": key },
      json: { title, body: "Body of the announcement." },
    });

  it("two identical requests at the same moment run the work once", async () => {
    const key = randomUUID();
    const title = `rel-${run} race announcement`;
    // Eight identical requests at once (a nervous double, triple... click).
    const all = await Promise.all(Array.from({ length: 8 }, () => announce(key, title)));
    // Each one either did the work, was told to wait (409 + Retry-After), or already got the saved answer.
    for (const r of all) expect([201, 409]).toContain(r.status);
    for (const r of all.filter((x) => x.status === 409)) {
      expect(r.body.error.code).toBe("CONFLICT");
      expect(r.headers.get("retry-after")).toBe("1");
    }
    const did = all.filter(
      (r) => r.status === 201 && r.headers.get("idempotent-replay") !== "true",
    );
    expect(did).toHaveLength(1);
    const { count } = await admin
      .from("announcements")
      .select("id", { count: "exact", head: true })
      .eq("title", title);
    expect(count).toBe(1);
    const retry = await announce(key, title);
    expect(retry.headers.get("idempotent-replay")).toBe("true");
    expect(retry.body.data.id).toBe(did[0]!.body.data.id);
  });

  it("the same key with another body is refused (422) and creates nothing", async () => {
    const key = randomUUID();
    await announce(key, `rel-${run} body one`);
    const other = await announce(key, `rel-${run} body two`);
    expect(other.status).toBe(422);
    expect(other.body.error.code).toBe("IDEMPOTENCY_KEY_REUSED");
    const { count } = await admin
      .from("announcements")
      .select("id", { count: "exact", head: true })
      .eq("title", `rel-${run} body two`);
    expect(count).toBe(0);
  });

  it("a failed attempt does not block the key: the same key works once the cause is gone", async () => {
    const made = await call(createPost, {
      method: "POST",
      path: `${base}/team-posts`,
      cookie: cookies.owner,
      params: { slug: SLUG },
      headers: { "idempotency-key": randomUUID() },
      json: {
        kind: "project",
        title: `rel-${run} one slot`,
        roles: [{ role_name: "Only role", slots: 1, skill_ids: [] }],
      },
    });
    const id = made.body.data.id as string;
    const role = made.body.data.roles[0].id as string;
    const ask = (who: string, key: string) =>
      call(requestRole, {
        method: "POST",
        path: `${base}/team-posts/${id}/roles/${role}/requests`,
        cookie: cookies[who],
        params: { slug: SLUG, id, roleId: role },
        headers: { "idempotency-key": key },
        json: { message: "please" },
      });
    const taker = await ask("applicant", randomUUID());
    await call(decide, {
      method: "POST",
      path: `${base}/join-requests/${taker.body.data.id}/decision`,
      cookie: cookies.owner,
      params: { slug: SLUG, id: taker.body.data.id },
      headers: { "idempotency-key": randomUUID() },
      json: { decision: "accepted" },
    });

    const key = randomUUID();
    const blocked = await ask("applicant2", key);
    expect(blocked.status).toBe(409);
    // the only role is full, so the post is filled and takes no more requests
    expect(blocked.body.error.code).toBe("CONFLICT");
    // the failed attempt left no claim behind
    expect(
      (
        await admin
          .from("idempotency_keys")
          .select("key", { count: "exact", head: true })
          .eq("key", key)
      ).count,
    ).toBe(0);

    await call(withdraw, {
      method: "DELETE",
      path: `${base}/join-requests/${taker.body.data.id}`,
      cookie: cookies.applicant,
      params: { slug: SLUG, id: taker.body.data.id },
    });
    const retried = await ask("applicant2", key);
    expect(retried.status).toBe(201);
    expect(retried.headers.get("idempotent-replay")).toBeNull();
    const again = await ask("applicant2", key);
    expect(again.headers.get("idempotent-replay")).toBe("true");
    expect(again.body.data.id).toBe(retried.body.data.id);
  });

  it("a key older than 24 hours works again as a new request", async () => {
    const key = randomUUID();
    const title = `rel-${run} old key`;
    const first = await announce(key, title);
    await admin
      .from("idempotency_keys")
      .update({ expires_at: new Date(Date.now() - 60_000).toISOString() })
      .eq("key", key);
    const second = await announce(key, title);
    expect(second.status).toBe(201);
    expect(second.headers.get("idempotent-replay")).toBeNull();
    expect(second.body.data.id).not.toBe(first.body.data.id);
  });
});

// ---------------------------------------------------------------------------
describe("TEN-01 modules (which tabs a college has on)", () => {
  const read = () =>
    call(publicCollege, { path: "/api/v1/colleges/public/alpha", params: { slug: "alpha" } });

  it("all three tabs are on by default, and an admin can switch one off", async () => {
    const before = await read();
    expectMatches(publicCollegeResponse, before.body);
    expect(before.body.data.modules).toEqual({ campus: true, collaborate: true, career: true });
    const { data: college } = await admin
      .from("colleges")
      .select("id")
      .eq("slug", "alpha")
      .single();
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
      const off = await read();
      expect(off.body.data.modules).toEqual({ campus: true, collaborate: true, career: false });
      expect(JSON.stringify(off.body)).not.toContain("features");
    } finally {
      await admin
        .from("college_settings")
        .update({ features: settings!.features })
        .eq("college_id", college!.id);
    }
    expect((await read()).body.data.modules.career).toBe(true);
  });
});
