import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { contentListResponse, contentRemoveResponse, errorEnvelope } from "@/contracts";
import { POST as otpRequest } from "@/app/api/v1/auth/otp/request/route";
import { POST as otpVerify } from "@/app/api/v1/auth/otp/verify/route";
import { GET as listContent } from "@/app/api/v1/c/[slug]/admin/content/route";
import { POST as removeContent } from "@/app/api/v1/c/[slug]/admin/content/remove/route";
import { adminClient } from "@/server/admin/supabase-admin";
import { call, clearInbox, clearRateLimits, expectMatches, signIn, type Result } from "./helpers";

// ADM-14 (newest content of the college) and ADM-13 (remove content with a reason), compared with src/contracts.
// Added by R5 in Day 3: the contract coverage test showed that no test compared the real answers of these two
// endpoints with their schemas. Who may call them is already covered by permission-matrix.test.ts.

const routes = { request: otpRequest, verify: otpVerify };
const admin = adminClient();
const SLUG = "alpha";
const run = randomUUID().slice(0, 8);

let adminCookie = "";
let moderatorCookie = "";
let authorId = "";
let collegeId = "";

const expectError = (result: Result, status: number, code: string) => {
  expect(result.status).toBe(status);
  expectMatches(errorEnvelope, result.body);
  expect(result.body.error.code).toBe(code);
};

const listAs = (cookie: string, query = "") =>
  call(listContent, {
    path: `/api/v1/c/${SLUG}/admin/content${query}`,
    cookie,
    params: { slug: SLUG },
  });

const removeAs = (cookie: string, json: unknown) =>
  call(removeContent, {
    method: "POST",
    path: `/api/v1/c/${SLUG}/admin/content/remove`,
    json,
    cookie,
    params: { slug: SLUG },
  });

// A plan (a team post) made straight in the database, the way performance.test.ts makes its rows.
async function newPlan(label: string): Promise<string> {
  const { data, error } = await admin
    .from("team_posts")
    .insert({
      college_id: collegeId,
      author_id: authorId,
      kind: "project",
      title: `adm-content-${run} ${label}`,
      description: "A plan made by a test.",
      status: "open",
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

// Audit rows of this college that name the item. Columns are not assumed: the whole row is searched for the id.
async function removalAuditRows(id: string) {
  const { data, error } = await admin
    .from("audit_logs")
    .select("*")
    .eq("college_id", collegeId)
    .eq("action", "content.removed");
  if (error) throw error;
  return (data ?? []).filter((row) => JSON.stringify(row).includes(id));
}

beforeAll(async () => {
  await clearInbox();
  await clearRateLimits();
  adminCookie = (await signIn(routes, "admin@alpha.test")).cookie;
  moderatorCookie = (await signIn(routes, "moderator@alpha.test")).cookie;
  authorId = (await signIn(routes, "student2@alpha.test")).userId;
  collegeId = (await admin.from("colleges").select("id").eq("slug", SLUG).single()).data!.id;
}, 120_000);

beforeEach(async () => {
  await clearRateLimits();
});

afterAll(async () => {
  await admin.from("team_posts").delete().like("title", `adm-content-${run}%`);
}, 120_000);

describe("ADM-14 newest content of the college", () => {
  it("a moderator sees the newest content, in the shape of the contract", async () => {
    const id = await newPlan("list");
    const result = await listAs(moderatorCookie, "?limit=100");
    expect(result.status).toBe(200);
    expectMatches(contentListResponse, result.body);
    const item = result.body.data.find((row: { id: string }) => row.id === id);
    expect(item).toMatchObject({ kind: "plan", title: `adm-content-${run} list`, status: "open" });
    expect(typeof item.author).toBe("string");
  });

  it("limit cuts the list", async () => {
    await newPlan("limit");
    const result = await listAs(adminCookie, "?limit=1");
    expect(result.status).toBe(200);
    expectMatches(contentListResponse, result.body);
    expect(result.body.data).toHaveLength(1);
  });
});

describe("ADM-13 remove content with a reason", () => {
  it("removes a plan: the answer matches the contract, the plan leaves the list, one audit row", async () => {
    const id = await newPlan("remove");
    expect(await removalAuditRows(id)).toHaveLength(0);

    const result = await removeAs(adminCookie, {
      kind: "plan",
      id,
      reason: "spam",
      note: "Looks like an advert.",
    });
    expect(result.status).toBe(200);
    expectMatches(contentRemoveResponse, result.body);
    expect(result.body.data).toEqual({ removed: true });

    const { data: row } = await admin.from("team_posts").select("status").eq("id", id).single();
    expect(row?.status).toBe("removed");

    const after = await listAs(adminCookie, "?limit=100");
    expect(after.body.data.some((item: { id: string }) => item.id === id)).toBe(false);
    expect(await removalAuditRows(id)).toHaveLength(1);
  });

  it("removing the same plan twice is NOT_FOUND", async () => {
    const id = await newPlan("twice");
    expect((await removeAs(adminCookie, { kind: "plan", id, reason: "duplicate" })).status).toBe(
      200,
    );
    expectError(
      await removeAs(adminCookie, { kind: "plan", id, reason: "duplicate" }),
      404,
      "NOT_FOUND",
    );
  });

  it("refuses a reason that is not in the list, and an item that does not exist", async () => {
    const id = await newPlan("refused");
    expectError(
      await removeAs(adminCookie, { kind: "plan", id, reason: "because" }),
      400,
      "VALIDATION_FAILED",
    );
    expectError(
      await removeAs(adminCookie, {
        kind: "plan",
        id: "11111111-1111-4111-8111-111111111111",
        reason: "spam",
      }),
      404,
      "NOT_FOUND",
    );
    // The refused calls did not remove the plan.
    const { data: row } = await admin.from("team_posts").select("status").eq("id", id).single();
    expect(row?.status).toBe("open");
  });
});
