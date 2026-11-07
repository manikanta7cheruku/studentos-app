import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { POST as otpRequest } from "@/app/api/v1/auth/otp/request/route";
import { POST as otpVerify } from "@/app/api/v1/auth/otp/verify/route";
import { GET as listPosts } from "@/app/api/v1/c/[slug]/team-posts/route";
import { GET as listOpps } from "@/app/api/v1/c/[slug]/opportunities/route";
import { GET as listAnnouncements } from "@/app/api/v1/c/[slug]/announcements/route";
import { GET as myNotifications } from "@/app/api/v1/me/notifications/route";
import { adminClient } from "@/server/admin/supabase-admin";
import { call, clearInbox, clearRateLimits, signIn } from "./helpers";

// Speed check with a college that has thousands of rows. The limits are generous (they must hold on a slow CI machine):
// they catch a missing index or a list that works out its answer for every row instead of for one page.
const routes = { request: otpRequest, verify: otpVerify };
const admin = adminClient();
const SLUG = "alpha";
const N = 4000;
const run = randomUUID().slice(0, 8);
let cookie = "";
let userId = "";
let college = "";
let author = "";

async function insertInBatches(table: string, rows: Record<string, unknown>[]) {
  for (let i = 0; i < rows.length; i += 1000) {
    const { error } = await admin.from(table).insert(rows.slice(i, i + 1000));
    if (error) throw new Error(`${table}: ${error.message}`);
  }
}

async function timed(path: string, handler: unknown, times = 15) {
  await call(handler, { path, cookie, params: { slug: SLUG } }); // warm up
  const ms: number[] = [];
  for (let i = 0; i < times; i++) {
    const start = performance.now();
    const result = await call(handler, { path, cookie, params: { slug: SLUG } });
    ms.push(performance.now() - start);
    expect(result.status).toBe(200);
  }
  ms.sort((a, b) => a - b);
  console.info(
    `[perf] ${path.split("?")[0]!.replace(/^.*\/api\/v1\//, "")}${path.includes("cursor") ? " (deep page)" : ""}: p50 ${ms[Math.floor(ms.length / 2)]!.toFixed(0)} ms, p95 ${ms[Math.floor(ms.length * 0.95)]!.toFixed(0)} ms`,
  );
  return {
    p50: ms[Math.floor(ms.length / 2)]!,
    p95: ms[Math.floor(ms.length * 0.95)]!,
    result: await call(handler, { path, cookie, params: { slug: SLUG } }),
  };
}

beforeAll(async () => {
  await clearInbox();
  await clearRateLimits();
  const session = await signIn(routes, "student1@alpha.test");
  cookie = session.cookie;
  userId = session.userId;
  author = (await signIn(routes, "student3@alpha.test")).userId;
  college = (await admin.from("colleges").select("id").eq("slug", SLUG).single()).data!.id;
  const now = Date.now();
  await insertInBatches(
    "team_posts",
    Array.from({ length: N }, (_, i) => ({
      college_id: college,
      author_id: author,
      kind: ["project", "startup", "hackathon", "competition"][i % 4],
      title: `perf-${run} team post ${i}`,
      description: "Something to build together.",
      status: "open",
      created_at: new Date(now - i * 1000).toISOString(),
    })),
  );
  await insertInBatches(
    "opportunities",
    Array.from({ length: N }, (_, i) => ({
      college_id: college,
      title: `perf-${run} opportunity ${i}`,
      org: "Acme",
      kind: ["internship", "job", "hackathon"][i % 3],
      apply_url: "https://acme.example.org/j",
      status: "published",
      skills: ["React"],
      created_at: new Date(now - i * 1000).toISOString(),
    })),
  );
  await insertInBatches(
    "announcements",
    Array.from({ length: N }, (_, i) => ({
      college_id: college,
      author_id: author,
      title: `perf-${run} announcement ${i}`,
      body: "Body",
      status: "published",
      publish_at: new Date(now - i * 1000).toISOString(),
    })),
  );
  await insertInBatches(
    "notifications",
    Array.from({ length: N }, (_, i) => ({
      user_id: userId,
      college_id: college,
      type: "report.actioned",
      payload: { title: "t", message: `perf-${run} ${i}` },
      created_at: new Date(now - i * 1000).toISOString(),
    })),
  );
  await admin.rpc("rate_limit_purge");
}, 300_000);

afterAll(async () => {
  await admin.from("team_posts").delete().like("title", `perf-${run}%`);
  await admin.from("opportunities").delete().like("title", `perf-${run}%`);
  await admin.from("announcements").delete().like("title", `perf-${run}%`);
  await admin.from("notifications").delete().eq("user_id", userId);
}, 120_000);

const LIMIT_MS = 600;

describe(`lists stay fast with ${N} rows each`, () => {
  it("team posts: first page, a filtered page, and a deep cursor page", async () => {
    const first = await timed(`/api/v1/c/${SLUG}/team-posts?limit=20`, listPosts);
    expect(first.result.body.data).toHaveLength(20);
    expect(first.p95).toBeLessThan(LIMIT_MS);
    const filtered = await timed(
      `/api/v1/c/${SLUG}/team-posts?kind=hackathon&q=build&limit=20`,
      listPosts,
    );
    expect(filtered.p95).toBeLessThan(LIMIT_MS);
    // walk 40 pages deep, then time the page there
    let cursor = first.result.body.meta.next_cursor as string;
    for (let page = 0; page < 40; page++) {
      const next = await call(listPosts, {
        path: `/api/v1/c/${SLUG}/team-posts?limit=20&cursor=${cursor}`,
        cookie,
        params: { slug: SLUG },
      });
      cursor = next.body.meta.next_cursor;
    }
    const deep = await timed(`/api/v1/c/${SLUG}/team-posts?limit=20&cursor=${cursor}`, listPosts);
    expect(deep.p95).toBeLessThan(LIMIT_MS);
  }, 120_000);

  it("opportunities: first page and a filtered page", async () => {
    const first = await timed(`/api/v1/c/${SLUG}/opportunities?limit=20`, listOpps);
    expect(first.result.body.data).toHaveLength(20);
    expect(first.p95).toBeLessThan(LIMIT_MS);
    const filtered = await timed(
      `/api/v1/c/${SLUG}/opportunities?kind=job&skills=react&deadline=hide_closed&limit=20`,
      listOpps,
    );
    expect(filtered.p95).toBeLessThan(LIMIT_MS);
  }, 120_000);

  it("announcements and notifications", async () => {
    const announcements = await timed(
      `/api/v1/c/${SLUG}/announcements?limit=20`,
      listAnnouncements,
    );
    expect(announcements.result.body.data).toHaveLength(20);
    expect(announcements.p95).toBeLessThan(LIMIT_MS);
    const notifications = await timed(`/api/v1/me/notifications?limit=20`, myNotifications);
    expect(notifications.result.body.data).toHaveLength(20);
    expect(notifications.result.body.meta.unread_count).toBeGreaterThanOrEqual(N);
    expect(notifications.p95).toBeLessThan(LIMIT_MS);
  }, 120_000);
});
