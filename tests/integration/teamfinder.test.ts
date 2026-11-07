import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  errorEnvelope,
  joinRequestCreateResponse,
  joinRequestDecisionResponse,
  joinRequestListResponse,
  joinRequestWithdrawResponse,
  myJoinRequestListResponse,
  notificationListResponse,
  teamPostListResponse,
  teamPostResponse,
} from "@/contracts";
import { POST as otpRequest } from "@/app/api/v1/auth/otp/request/route";
import { POST as otpVerify } from "@/app/api/v1/auth/otp/verify/route";
import { GET as listPosts, POST as createPost } from "@/app/api/v1/c/[slug]/team-posts/route";
import { GET as getPost, PATCH as patchPost } from "@/app/api/v1/c/[slug]/team-posts/[id]/route";
import { POST as closePost } from "@/app/api/v1/c/[slug]/team-posts/[id]/close/route";
import { POST as requestRole } from "@/app/api/v1/c/[slug]/team-posts/[id]/roles/[roleId]/requests/route";
import { GET as listRequests } from "@/app/api/v1/c/[slug]/team-posts/[id]/requests/route";
import { POST as decide } from "@/app/api/v1/c/[slug]/join-requests/[id]/decision/route";
import { DELETE as withdraw } from "@/app/api/v1/c/[slug]/join-requests/[id]/route";
import { GET as myRequests } from "@/app/api/v1/c/[slug]/me/join-requests/route";
import { GET as myNotifications } from "@/app/api/v1/me/notifications/route";
import { POST as createReport } from "@/app/api/v1/c/[slug]/reports/route";
import { POST as actOnReport } from "@/app/api/v1/c/[slug]/admin/reports/[id]/action/route";
import { DELETE as unblock, PUT as block } from "@/app/api/v1/me/blocks/[userId]/route";
import { adminClient } from "@/server/admin/supabase-admin";
import { call, clearInbox, clearRateLimits, expectMatches, signIn, type Result } from "./helpers";

const routes = { request: otpRequest, verify: otpVerify };
const admin = adminClient();
const SLUG = "alpha";
const run = randomUUID().slice(0, 8);
const TS_SKILL = "88888888-8888-4888-8888-888888888888";
const idem = () => ({ "idempotency-key": randomUUID() });

type Who = "owner" | "applicant" | "applicant2" | "moderator" | "pending" | "beta";
const emails: Record<Who, string> = {
  owner: "student3@alpha.test",
  applicant: "student1@alpha.test",
  applicant2: "student2@alpha.test",
  moderator: "moderator@alpha.test",
  pending: "pending@alpha.test",
  beta: "student1@beta.test",
};
const cookies = {} as Record<Who, string>;
const ids = {} as Record<Who, string>;

const expectError = (result: Result, status: number, code: string) => {
  expect(result.status).toBe(status);
  expectMatches(errorEnvelope, result.body);
  expect(result.body.error.code).toBe(code);
};

const base = `/api/v1/c/${SLUG}`;
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

const roles = [
  { role_name: "Backend developer", slots: 1, skill_ids: [TS_SKILL] },
  { role_name: "UI designer", slots: 2, skill_ids: [] },
];
const newPost = (who: Who, title: string, extra: Record<string, unknown> = {}) =>
  send(createPost, who, `${base}/team-posts`, {
    method: "POST",
    json: {
      kind: "hackathon",
      title: `tf-${run} ${title}`,
      description: "Building an IoT thing.",
      roles,
      ...extra,
    },
    headers: idem(),
  });
const post = (who: Who, id: string) =>
  send(getPost, who, `${base}/team-posts/${id}`, { params: { slug: SLUG, id } });
const list = (who: Who | undefined, query = "") =>
  send(listPosts, who, `${base}/team-posts${query}`);
const ask = (who: Who, postId: string, roleId: string, message = "I can help") =>
  send(requestRole, who, `${base}/team-posts/${postId}/roles/${roleId}/requests`, {
    method: "POST",
    json: { message },
    params: { slug: SLUG, id: postId, roleId },
    headers: idem(),
  });
const decideReq = (who: Who, id: string, json: unknown) =>
  send(decide, who, `${base}/join-requests/${id}/decision`, {
    method: "POST",
    json,
    params: { slug: SLUG, id },
    headers: idem(),
  });
const notes = (who: Who) => send(myNotifications, who, "/api/v1/me/notifications?limit=50");
const roleOf = (created: Result, name: string) =>
  created.body.data.roles.find((r: { role_name: string }) => r.role_name === name).id as string;

async function created(who: Who, title: string, extra: Record<string, unknown> = {}) {
  const result = await newPost(who, title, extra);
  expect(result.status).toBe(201);
  return result;
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
  // at most 10 open posts per person: start every test without the posts of earlier tests
  await admin.from("team_posts").delete().like("title", `tf-${run}%`);
});

afterAll(async () => {
  const { data } = await admin.from("team_posts").select("id").like("title", `tf-${run}%`);
  const postIds = (data ?? []).map((p) => p.id);
  if (postIds.length) {
    await admin.from("reports").delete().in("target_id", postIds);
    await admin.from("team_posts").delete().in("id", postIds);
  }
  await admin
    .from("blocks")
    .delete()
    .or(`blocker_id.eq.${ids.applicant},blocked_id.eq.${ids.applicant}`);
  await admin.from("notifications").delete().gt("created_at", "2000-01-01");
}, 120_000);

// ---------------------------------------------------------------------------
describe("TMF-01 create", () => {
  it("a member creates a post with roles; the answer matches the contract", async () => {
    const result = await newPost("owner", "create ok", {
      team_link: "https://chat.example.org/r1",
    });
    expect(result.status).toBe(201);
    expectMatches(teamPostResponse, result.body);
    expect(result.body.data).toMatchObject({
      status: "open",
      is_owner: true,
      team_link: "https://chat.example.org/r1",
      pending_requests: 0,
    });
    expect(result.body.data.roles).toHaveLength(2);
    expect(result.body.data.roles[0]).toMatchObject({ filled: 0, skills: ["TypeScript"] });
  });

  it("is refused for a pending member (403), another college (404) and nobody signed in (401)", async () => {
    expectError(await newPost("pending", "pending"), 403, "MEMBERSHIP_NOT_ACTIVE");
    expectError(
      await send(createPost, "beta", `${base}/team-posts`, {
        method: "POST",
        json: {},
        headers: idem(),
      }),
      404,
      "NOT_FOUND",
    );
    expectError(
      await send(createPost, undefined, `${base}/team-posts`, {
        method: "POST",
        json: {},
        headers: idem(),
      }),
      401,
      "UNAUTHENTICATED",
    );
  });

  it("validates the input (400 with fields)", async () => {
    const bad = [
      { title: "abc" },
      { roles: [] },
      { roles: [{ role_name: "x", slots: 0, skill_ids: [] }] },
      { external_link: "http://insecure.example.org" },
      { deadline: new Date(Date.now() - 86_400_000).toISOString() },
      { deadline: new Date(Date.now() + 200 * 86_400_000).toISOString() },
      { roles: [{ role_name: "x", slots: 1, skill_ids: [randomUUID()] }] },
      { kind: "party" },
      { admin: true },
    ];
    for (const extra of bad)
      expectError(await newPost("owner", "bad", extra), 400, "VALIDATION_FAILED");
    expectError(
      await send(createPost, "owner", `${base}/team-posts`, {
        method: "POST",
        json: { kind: "project", title: "No key here", roles },
      }),
      400,
      "VALIDATION_FAILED",
    );
  });

  it("a retry with the same Idempotency-Key makes only one post", async () => {
    const key = randomUUID();
    const json = { kind: "project", title: `tf-${run} replay post`, roles };
    const go = () =>
      send(createPost, "owner", `${base}/team-posts`, {
        method: "POST",
        json,
        headers: { "idempotency-key": key },
      });
    const first = await go();
    const again = await go();
    expect(again.headers.get("idempotent-replay")).toBe("true");
    expect(again.body.data.id).toBe(first.body.data.id);
    const { count } = await admin
      .from("team_posts")
      .select("id", { count: "exact", head: true })
      .eq("title", json.title);
    expect(count).toBe(1);
  });
});

// ---------------------------------------------------------------------------
describe("TMF-02 and TMF-03 browse and detail", () => {
  it("lists open posts with filters and paging; another college and pending members are refused", async () => {
    const a = await created("owner", "browse alpha");
    const b = await created("applicant", "browse beta", { kind: "project" });
    const all = await list("applicant2", "?limit=50");
    expect(all.status).toBe(200);
    expectMatches(teamPostListResponse, all.body);
    const seen = all.body.data.map((p: { id: string }) => p.id);
    expect(seen).toEqual(expect.arrayContaining([a.body.data.id, b.body.data.id]));
    expect(seen.indexOf(b.body.data.id)).toBeLessThan(seen.indexOf(a.body.data.id));

    const project = await list("applicant2", "?kind=project&limit=50");
    expect(project.body.data.every((p: { kind: string }) => p.kind === "project")).toBe(true);
    expect(
      (await list("applicant2", `?skill=${TS_SKILL}&limit=50`)).body.data.map(
        (p: { id: string }) => p.id,
      ),
    ).toContain(a.body.data.id);
    expect(
      (
        await list("applicant2", `?q=${encodeURIComponent(`tf-${run} browse beta`)}&limit=50`)
      ).body.data.map((p: { id: string }) => p.id),
    ).toContain(b.body.data.id);
    expect(
      (await list("owner", "?mine=true&limit=50")).body.data.every(
        (p: { author: { user_id: string } }) => p.author.user_id === ids.owner,
      ),
    ).toBe(true);

    const page1 = await list("applicant2", "?limit=1");
    expect(page1.body.data).toHaveLength(1);
    const page2 = await list("applicant2", `?limit=1&cursor=${page1.body.meta.next_cursor}`);
    expect(page2.body.data[0].id).not.toBe(page1.body.data[0].id);
    expectError(await list("applicant2", "?cursor=garbage"), 400, "VALIDATION_FAILED");
    expectError(await list("applicant2", "?status=weird"), 400, "VALIDATION_FAILED");

    expectError(await list("beta"), 404, "NOT_FOUND");
    expectError(await list("pending"), 403, "MEMBERSHIP_NOT_ACTIVE");
    expectError(await list(undefined), 401, "UNAUTHENTICATED");
  });

  it("an expired post is only in the expired list", async () => {
    const made = await created("owner", "expired one", {
      deadline: new Date(Date.now() + 86_400_000).toISOString(),
    });
    await admin
      .from("team_posts")
      .update({ deadline: new Date(Date.now() - 3_600_000).toISOString() })
      .eq("id", made.body.data.id);
    expect(
      (await list("applicant2", "?limit=50")).body.data.map((p: { id: string }) => p.id),
    ).not.toContain(made.body.data.id);
    const expired = await list("applicant2", "?status=expired&limit=50");
    expect(expired.body.data.find((p: { id: string }) => p.id === made.body.data.id)?.status).toBe(
      "expired",
    );
    const role = roleOf(made, "UI designer");
    expectError(await ask("applicant2", made.body.data.id, role), 409, "CONFLICT");
  });

  it("the team link and the pending count are private to the author (and the link to accepted members)", async () => {
    const made = await created("owner", "private link", {
      team_link: "https://chat.example.org/secret",
    });
    const id = made.body.data.id as string;
    const asOwner = await post("owner", id);
    expect(asOwner.body.data.team_link).toBe("https://chat.example.org/secret");
    const asOther = await post("applicant2", id);
    expect(asOther.status).toBe(200);
    expectMatches(teamPostResponse, asOther.body);
    expect(asOther.body.data.team_link).toBeNull();
    expect(asOther.body.data).not.toHaveProperty("pending_requests");
    expect(JSON.stringify(asOther.body)).not.toContain("chat.example.org");

    const requested = await ask("applicant", id, roleOf(made, "UI designer"));
    expect((await post("applicant", id)).body.data.team_link).toBeNull();
    await decideReq("owner", requested.body.data.id, { decision: "accepted" });
    expect((await post("applicant", id)).body.data.team_link).toBe(
      "https://chat.example.org/secret",
    );
    expect((await post("applicant2", id)).body.data.team_link).toBeNull();

    expectError(await post("beta", id), 404, "NOT_FOUND");
    expectError(
      await send(getPost, "applicant2", `${base}/team-posts/not-a-uuid`, {
        params: { slug: SLUG, id: "not-a-uuid" },
      }),
      404,
      "NOT_FOUND",
    );
  });

  it("someone you blocked is hidden from you and you from them, until you unblock", async () => {
    const made = await created("owner", "blocked author");
    const id = made.body.data.id as string;
    const put = await call(block, {
      method: "PUT",
      path: `/api/v1/me/blocks/${ids.owner}`,
      params: { userId: ids.owner },
      cookie: cookies.applicant,
    });
    expect(put.status).toBe(200);
    expect(
      (await list("applicant", "?limit=50")).body.data.map((p: { id: string }) => p.id),
    ).not.toContain(id);
    expectError(await post("applicant", id), 404, "NOT_FOUND");
    expectError(await ask("applicant", id, roleOf(made, "UI designer")), 404, "NOT_FOUND");
    await call(unblock, {
      method: "DELETE",
      path: `/api/v1/me/blocks/${ids.owner}`,
      params: { userId: ids.owner },
      cookie: cookies.applicant,
    });
    expect(
      (await list("applicant", "?limit=50")).body.data.map((p: { id: string }) => p.id),
    ).toContain(id);
  });
});

// ---------------------------------------------------------------------------
describe("TMF-04 and TMF-05 edit and close", () => {
  it("only the author edits (403), only while open; the answer matches the contract", async () => {
    const made = await created("owner", "edit me");
    const id = made.body.data.id as string;
    const edit = (who: Who, json: unknown) =>
      send(patchPost, who, `${base}/team-posts/${id}`, {
        method: "PATCH",
        json,
        params: { slug: SLUG, id },
      });
    const ok = await edit("owner", { title: `tf-${run} edited title`, deadline: null });
    expect(ok.status).toBe(200);
    expectMatches(teamPostResponse, ok.body);
    expect(ok.body.data.title).toBe(`tf-${run} edited title`);
    expectError(await edit("applicant", { title: "Hijacked title" }), 403, "FORBIDDEN");
    expectError(await edit("owner", {}), 400, "VALIDATION_FAILED");
    expectError(
      await edit("owner", { deadline: new Date(Date.now() - 1000).toISOString() }),
      400,
      "VALIDATION_FAILED",
    );
    expectError(await edit("beta", { title: "Other college" }), 404, "NOT_FOUND");
    await send(closePost, "owner", `${base}/team-posts/${id}/close`, {
      method: "POST",
      params: { slug: SLUG, id },
    });
    expectError(await edit("owner", { title: "Edit after close" }), 409, "CONFLICT");
  });

  it("closing cancels waiting requests and tells the applicants; closing twice is 409", async () => {
    const made = await created("owner", "close me");
    const id = made.body.data.id as string;
    const requested = await ask("applicant", id, roleOf(made, "UI designer"));
    const close = (who: Who) =>
      send(closePost, who, `${base}/team-posts/${id}/close`, {
        method: "POST",
        params: { slug: SLUG, id },
      });
    expectError(await close("applicant"), 403, "FORBIDDEN");
    const closed = await close("owner");
    expect(closed.status).toBe(200);
    expect(closed.body.data.status).toBe("closed");
    const mine = await send(myRequests, "applicant", `${base}/me/join-requests?limit=50`);
    expectMatches(myJoinRequestListResponse, mine.body);
    expect(
      mine.body.data.find((r: { id: string }) => r.id === requested.body.data.id)?.status,
    ).toBe("cancelled");
    const told = await notes("applicant");
    expect(
      told.body.data.some(
        (n: { type: string; payload: { post_id?: string } }) =>
          n.type === "team.request_cancelled" && n.payload.post_id === id,
      ),
    ).toBe(true);
    expectError(await close("owner"), 409, "CONFLICT");
    expectError(await ask("applicant2", id, roleOf(made, "UI designer")), 409, "CONFLICT");
  });
});

// ---------------------------------------------------------------------------
describe("TMF-06 to TMF-09 requests and decisions", () => {
  it("request, notify the owner, list for the owner, accept, notify the applicant", async () => {
    const made = await created("owner", "full flow");
    const id = made.body.data.id as string;
    const backend = roleOf(made, "Backend developer");
    const requested = await ask("applicant", id, backend, "I built the backend last term.");
    expect(requested.status).toBe(201);
    expectMatches(joinRequestCreateResponse, requested.body);
    expect(requested.body.data.status).toBe("pending");
    const toOwner = await notes("owner");
    expect(
      toOwner.body.data.some(
        (n: { type: string; payload: { request_id?: string } }) =>
          n.type === "team.request_received" && n.payload.request_id === requested.body.data.id,
      ),
    ).toBe(true);

    const asApplicant = await post("applicant", id);
    expect(asApplicant.body.data.my_requests).toEqual([
      { id: requested.body.data.id, role_id: backend, status: "pending" },
    ]);
    expect((await post("owner", id)).body.data.pending_requests).toBe(1);

    const queue = await send(
      listRequests,
      "owner",
      `${base}/team-posts/${id}/requests?status=pending`,
      { params: { slug: SLUG, id } },
    );
    expect(queue.status).toBe(200);
    expectMatches(joinRequestListResponse, queue.body);
    expect(queue.body.data[0]).toMatchObject({
      role_name: "Backend developer",
      message: "I built the backend last term.",
    });
    expect(JSON.stringify(queue.body)).not.toContain("@alpha.test");
    expectError(
      await send(listRequests, "applicant", `${base}/team-posts/${id}/requests`, {
        params: { slug: SLUG, id },
      }),
      403,
      "FORBIDDEN",
    );

    const accepted = await decideReq("owner", requested.body.data.id, {
      decision: "accepted",
      note: "Welcome!",
    });
    expect(accepted.status).toBe(200);
    expectMatches(joinRequestDecisionResponse, accepted.body);
    expect(accepted.body.data.role).toMatchObject({ slots: 1, filled: 1 });
    const told = await notes("applicant");
    expect(
      told.body.data.some(
        (n: { type: string; payload: { message: string } }) =>
          n.type === "team.request_accepted" && n.payload.message.includes("Welcome!"),
      ),
    ).toBe(true);
    expectError(
      await decideReq("owner", requested.body.data.id, { decision: "declined" }),
      409,
      "CONFLICT",
    );
  });

  it("refuses duplicates, your own post, bad ids, foreign roles and outsiders", async () => {
    const made = await created("owner", "refusals");
    const other = await created("owner", "refusals other");
    const id = made.body.data.id as string;
    const ui = roleOf(made, "UI designer");
    expect((await ask("applicant", id, ui)).status).toBe(201);
    expectError(await ask("applicant", id, ui), 409, "ALREADY_REQUESTED");
    expectError(await ask("owner", id, ui), 403, "FORBIDDEN");
    expectError(await ask("applicant2", id, roleOf(other, "UI designer")), 404, "NOT_FOUND");
    expectError(await ask("pending", id, ui), 403, "MEMBERSHIP_NOT_ACTIVE");
    expectError(await ask("beta", id, ui), 404, "NOT_FOUND");
    expectError(
      await send(requestRole, "applicant2", `${base}/team-posts/${id}/roles/${ui}/requests`, {
        method: "POST",
        json: { message: "x".repeat(501) },
        params: { slug: SLUG, id, roleId: ui },
        headers: idem(),
      }),
      400,
      "VALIDATION_FAILED",
    );
    expectError(
      await decideReq("applicant2", randomUUID(), { decision: "accepted" }),
      404,
      "NOT_FOUND",
    );
    expectError(
      await decideReq("owner", randomUUID(), { decision: "maybe" }),
      400,
      "VALIDATION_FAILED",
    );
  });

  it("only the owner decides; a decline carries the note; the others stay as they were", async () => {
    const made = await created("owner", "decline flow");
    const id = made.body.data.id as string;
    const r = await ask("applicant", id, roleOf(made, "UI designer"));
    expectError(
      await decideReq("applicant2", r.body.data.id, { decision: "accepted" }),
      403,
      "FORBIDDEN",
    );
    expectError(
      await decideReq("moderator", r.body.data.id, { decision: "accepted" }),
      403,
      "FORBIDDEN",
    );
    const declined = await decideReq("owner", r.body.data.id, {
      decision: "declined",
      note: "Not this time",
    });
    expect(declined.body.data.request.status).toBe("declined");
    expect(declined.body.data.role.filled).toBe(0);
    const told = await notes("applicant");
    expect(
      told.body.data.some(
        (n: { type: string; payload: { message: string } }) =>
          n.type === "team.request_declined" && n.payload.message.includes("Not this time"),
      ),
    ).toBe(true);
    // after a decline the person may ask again
    expect((await ask("applicant", id, roleOf(made, "UI designer"))).status).toBe(201);
  });

  it("AC-TMF-004: two accepts at the same time for the last slot give exactly one 200 and one SLOTS_FULL", async () => {
    const made = await created("owner", "race for the slot");
    const id = made.body.data.id as string;
    const backend = roleOf(made, "Backend developer");
    const r1 = await ask("applicant", id, backend);
    const r2 = await ask("applicant2", id, backend);
    const [a, b] = await Promise.all([
      decideReq("owner", r1.body.data.id, { decision: "accepted" }),
      decideReq("owner", r2.body.data.id, { decision: "accepted" }),
    ]);
    expect([a.status, b.status].sort()).toEqual([200, 409]);
    const loser = a.status === 409 ? a : b;
    expect(loser.body.error.code).toBe("SLOTS_FULL");
    const { data } = await admin
      .from("team_post_roles")
      .select("filled, slots")
      .eq("id", backend)
      .single();
    expect(data).toEqual({ filled: 1, slots: 1 });
    const { count } = await admin
      .from("join_requests")
      .select("id", { count: "exact", head: true })
      .eq("role_id", backend)
      .eq("status", "accepted");
    expect(count).toBe(1);
  });

  it("a double click (two different keys at once) makes one request and one ALREADY_REQUESTED", async () => {
    const made = await created("owner", "double click");
    const id = made.body.data.id as string;
    const ui = roleOf(made, "UI designer");
    const [a, b] = await Promise.all([ask("applicant2", id, ui), ask("applicant2", id, ui)]);
    expect([a.status, b.status].sort()).toEqual([201, 409]);
    const { count } = await admin
      .from("join_requests")
      .select("id", { count: "exact", head: true })
      .eq("role_id", ui)
      .eq("applicant_id", ids.applicant2);
    expect(count).toBe(1);
  });

  it("when the last slot is taken the post is filled and the waiting requests are cancelled", async () => {
    const made = await created("owner", "fill it up", {
      roles: [{ role_name: "Only role", slots: 1, skill_ids: [] }],
    });
    const id = made.body.data.id as string;
    const role = made.body.data.roles[0].id as string;
    const r1 = await ask("applicant", id, role);
    const r2 = await ask("applicant2", id, role);
    await decideReq("owner", r1.body.data.id, { decision: "accepted" });
    expect((await post("owner", id)).body.data.status).toBe("filled");
    const mine = await send(myRequests, "applicant2", `${base}/me/join-requests?limit=50`);
    expect(mine.body.data.find((r: { id: string }) => r.id === r2.body.data.id)?.status).toBe(
      "cancelled",
    );
    expect(
      (await list("applicant2", "?status=filled&limit=50")).body.data.map(
        (p: { id: string }) => p.id,
      ),
    ).toContain(id);
    expect(
      (await list("applicant2", "?limit=50")).body.data.map((p: { id: string }) => p.id),
    ).not.toContain(id);
  });

  it("TMF-09 withdraw: a waiting request, an accepted one (slot freed, audit row), nobody else's", async () => {
    const made = await created("owner", "withdraw flow", {
      roles: [{ role_name: "Only role", slots: 1, skill_ids: [] }],
    });
    const id = made.body.data.id as string;
    const role = made.body.data.roles[0].id as string;
    const del = (who: Who, reqId: string) =>
      send(withdraw, who, `${base}/join-requests/${reqId}`, {
        method: "DELETE",
        params: { slug: SLUG, id: reqId },
      });

    const waiting = await ask("applicant2", id, role);
    expectError(await del("applicant", waiting.body.data.id), 404, "NOT_FOUND");
    const gone = await del("applicant2", waiting.body.data.id);
    expect(gone.status).toBe(200);
    expectMatches(joinRequestWithdrawResponse, gone.body);
    expectError(await del("applicant2", waiting.body.data.id), 409, "CONFLICT");

    const mine = await ask("applicant", id, role);
    await decideReq("owner", mine.body.data.id, { decision: "accepted" });
    expect((await post("owner", id)).body.data.status).toBe("filled");
    const left = await del("applicant", mine.body.data.id);
    expect(left.status).toBe(200);
    const after = await post("owner", id);
    expect(after.body.data.status).toBe("open");
    expect(after.body.data.roles[0].filled).toBe(0);
    const audit = await admin
      .from("audit_logs")
      .select("action, actor_id")
      .eq("request_id", left.headers.get("x-request-id")!)
      .single();
    expect(audit.data).toEqual({
      action: "team.accepted_member_withdrew",
      actor_id: ids.applicant,
    });
    const told = await notes("owner");
    expect(told.body.data.some((n: { type: string }) => n.type === "team.request_withdrawn")).toBe(
      true,
    );
    expectMatches(notificationListResponse, told.body);
    expect((await ask("applicant2", id, role)).status).toBe(201);
  });
});

// ---------------------------------------------------------------------------
describe("reports on team posts", () => {
  it("a member reports a post, a moderator hides it, and it leaves every list", async () => {
    const made = await created("owner", "report me");
    const id = made.body.data.id as string;
    const reported = await send(createReport, "applicant2", `${base}/reports`, {
      method: "POST",
      json: { target_type: "team_post", target_id: id, reason: "scam" },
      headers: idem(),
    });
    expect(reported.status).toBe(201);
    expectError(
      await send(createReport, "owner", `${base}/reports`, {
        method: "POST",
        json: { target_type: "team_post", target_id: id, reason: "spam" },
        headers: idem(),
      }),
      400,
      "VALIDATION_FAILED",
    );
    const hidden = await send(
      actOnReport,
      "moderator",
      `${base}/admin/reports/${reported.body.data.id}/action`,
      {
        method: "POST",
        json: { action: "hide", note: "Looks like a scam" },
        params: { slug: SLUG, id: reported.body.data.id },
        headers: idem(),
      },
    );
    expect(hidden.status).toBe(200);
    expect(
      (await list("applicant2", "?limit=50")).body.data.map((p: { id: string }) => p.id),
    ).not.toContain(id);
    expectError(await post("applicant2", id), 404, "NOT_FOUND");
    expect((await post("owner", id)).status).toBe(200);
    const told = await notes("owner");
    expect(told.body.data.some((n: { type: string }) => n.type === "moderation.hidden")).toBe(true);
  });
});
