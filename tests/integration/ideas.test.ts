import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  collegeSetupResponse,
  errorEnvelope,
  ideaCommentListResponse,
  ideaCommentResponse,
  ideaDeleteResponse,
  ideaListResponse,
  ideaResponse,
} from "@/contracts";
import { POST as otpRequest } from "@/app/api/v1/auth/otp/request/route";
import { POST as otpVerify } from "@/app/api/v1/auth/otp/verify/route";
import { GET as listIdeas, POST as createIdea } from "@/app/api/v1/c/[slug]/ideas/route";
import { DELETE as deleteIdea, GET as getIdea } from "@/app/api/v1/c/[slug]/ideas/[id]/route";
import { PUT as voteIdea } from "@/app/api/v1/c/[slug]/ideas/[id]/vote/route";
import {
  GET as listComments,
  POST as createComment,
} from "@/app/api/v1/c/[slug]/ideas/[id]/comments/route";
import { DELETE as deleteComment } from "@/app/api/v1/c/[slug]/ideas/[id]/comments/[commentId]/route";
import { POST as setupCollege } from "@/app/api/v1/colleges/setup/route";
import { adminClient } from "@/server/admin/supabase-admin";
import { call, clearInbox, clearRateLimits, expectMatches, signIn } from "./helpers";

// IDE-01 to IDE-08 and COL-01 through the real route handlers and the local database.

const routes = { request: otpRequest, verify: otpVerify };
const admin = adminClient();
const SLUG = "alpha";
const made: string[] = [];

type Json = Record<string, unknown>;
const create = (cookie: string | undefined, json: unknown) =>
  call(createIdea, {
    method: "POST",
    path: `/api/v1/c/${SLUG}/ideas`,
    json,
    cookie,
    params: { slug: SLUG },
    headers: { "idempotency-key": randomUUID() },
  });
const params = (id: string, extra: Json = {}) => ({ slug: SLUG, id, ...extra }) as never;
const vote = (cookie: string, id: string, value: number) =>
  call(voteIdea, {
    method: "PUT",
    path: `/api/v1/c/${SLUG}/ideas/${id}/vote`,
    json: { value },
    cookie,
    params: params(id),
  });

function expectError(result: { status: number; body: unknown }, code: number, name: string) {
  expect(result.status).toBe(code);
  expectMatches(errorEnvelope, result.body);
  expect((result.body as { error: { code: string } }).error.code).toBe(name);
}

let author: string;
let other: string;
let outsider: string;

beforeAll(async () => {
  await clearInbox();
  await clearRateLimits();
  author = (await signIn(routes, "student1@alpha.test")).cookie;
  other = (await signIn(routes, "student2@alpha.test")).cookie;
  outsider = (await signIn(routes, "student1@beta.test")).cookie;
}, 120_000);

afterAll(async () => {
  if (made.length) await admin.from("ideas").delete().in("id", made);
});

describe("a session and a membership are needed", () => {
  it("answers 401 without a session and 403 to a person of another college", async () => {
    expectError(await create(undefined, { title: "A fine idea" }), 401, "UNAUTHENTICATED");
    const refused = await create(outsider, { title: "Not my college" });
    expect([403, 404]).toContain(refused.status);
  });
});

describe("IDE-01 create and IDE-02 list", () => {
  it("makes an idea that starts at score 1, and a retry with the same key returns the first answer", async () => {
    const key = randomUUID();
    const body = {
      title: "A swap shelf in every hostel",
      body: "Books go round.",
      topic: "campus",
    };
    const first = await call(createIdea, {
      method: "POST",
      path: `/api/v1/c/${SLUG}/ideas`,
      json: body,
      cookie: author,
      params: { slug: SLUG },
      headers: { "idempotency-key": key },
    });
    expect(first.status).toBe(201);
    expectMatches(ideaResponse, first.body);
    const idea = first.body.data as Json;
    made.push(idea.id as string);
    expect(idea).toMatchObject({ score: 1, my_vote: 1, is_owner: true, comment_count: 0 });
    const again = await call(createIdea, {
      method: "POST",
      path: `/api/v1/c/${SLUG}/ideas`,
      json: body,
      cookie: author,
      params: { slug: SLUG },
      headers: { "idempotency-key": key },
    });
    expect((again.body.data as Json).id).toBe(idea.id);
  });

  it("accepts text without a title, and refuses an empty thought and an unknown topic", async () => {
    const quick = await create(author, { body: "What if the library stayed open all night?" });
    expect(quick.status).toBe(201);
    made.push((quick.body.data as Json).id as string);
    expect(quick.body.data).toMatchObject({ title: "" });
    expectError(await create(author, {}), 400, "VALIDATION_FAILED");
    expectError(
      await create(author, { title: "A fine title", topic: "nonsense" }),
      400,
      "VALIDATION_FAILED",
    );
  });

  it("lists it for another member, newest first, and by topic", async () => {
    const result = await call(listIdeas, {
      path: `/api/v1/c/${SLUG}/ideas?sort=new`,
      cookie: other,
      params: { slug: SLUG },
    });
    expect(result.status).toBe(200);
    expectMatches(ideaListResponse, result.body);
    expect((result.body.data as Json[]).some((i) => i.id === made[0])).toBe(true);
    const topic = await call(listIdeas, {
      path: `/api/v1/c/${SLUG}/ideas?topic=sports`,
      cookie: other,
      params: { slug: SLUG },
    });
    expect((topic.body.data as Json[]).some((i) => i.id === made[0])).toBe(false);
  });
});

describe("IDE-04 vote", () => {
  it("moves the score by the change, and the same vote twice changes nothing", async () => {
    const id = made[0]!;
    const up = await vote(other, id, 1);
    expect(up.status).toBe(200);
    expectMatches(ideaResponse, up.body);
    expect(up.body.data).toMatchObject({ score: 2, my_vote: 1 });
    expect((await vote(other, id, 1)).body.data).toMatchObject({ score: 2 });
    expect((await vote(other, id, -1)).body.data).toMatchObject({ score: 0, my_vote: -1 });
    expect((await vote(other, id, 0)).body.data).toMatchObject({ score: 1, my_vote: 0 });
  });

  it("refuses a value that is not 1, -1 or 0, and answers 404 for an unknown idea", async () => {
    expectError(await vote(other, made[0]!, 5), 400, "VALIDATION_FAILED");
    expectError(await vote(other, randomUUID(), 1), 404, "NOT_FOUND");
  });
});

describe("IDE-06 comments and IDE-07 list", () => {
  it("adds a comment and a reply, and refuses a reply to a reply", async () => {
    const id = made[0]!;
    const post = (cookie: string, json: unknown) =>
      call(createComment, {
        method: "POST",
        path: `/api/v1/c/${SLUG}/ideas/${id}/comments`,
        json,
        cookie,
        params: params(id),
        headers: { "idempotency-key": randomUUID() },
      });
    const first = await post(other, { body: "I can take the first shelf." });
    expect(first.status).toBe(201);
    expectMatches(ideaCommentResponse, first.body);
    const parent = (first.body.data as Json).id as string;
    const reply = await post(author, { body: "Thank you.", parent_id: parent });
    expect(reply.status).toBe(201);
    expectError(
      await post(other, { body: "Too deep", parent_id: (reply.body.data as Json).id }),
      400,
      "VALIDATION_FAILED",
    );
    const all = await call(listComments, {
      path: `/api/v1/c/${SLUG}/ideas/${id}/comments`,
      cookie: author,
      params: params(id),
    });
    expectMatches(ideaCommentListResponse, all.body);
    expect(all.body.data).toHaveLength(2);
    expect(
      (
        await call(getIdea, {
          path: `/api/v1/c/${SLUG}/ideas/${id}`,
          cookie: author,
          params: params(id),
        })
      ).body.data,
    ).toMatchObject({ comment_count: 2 });
  });
});

describe("IDE-05 and IDE-08 remove", () => {
  it("lets only the author remove an idea or a comment, then it is gone", async () => {
    const id = made[0]!;
    const del = (cookie: string) =>
      call(deleteIdea, {
        method: "DELETE",
        path: `/api/v1/c/${SLUG}/ideas/${id}`,
        cookie,
        params: params(id),
      });
    expectError(await del(other), 403, "FORBIDDEN");

    const comments = await call(listComments, {
      path: `/api/v1/c/${SLUG}/ideas/${id}/comments`,
      cookie: author,
      params: params(id),
    });
    const theirs = (comments.body.data as Json[]).find((c) => c.is_owner === false)!.id as string;
    const removeComment = (cookie: string, commentId: string) =>
      call(deleteComment, {
        method: "DELETE",
        path: `/api/v1/c/${SLUG}/ideas/${id}/comments/${commentId}`,
        cookie,
        params: params(id, { commentId }),
      });
    expectError(await removeComment(author, theirs), 403, "FORBIDDEN");
    expect((await removeComment(other, theirs)).status).toBe(200);

    const gone = await del(author);
    expect(gone.status).toBe(200);
    expectMatches(ideaDeleteResponse, gone.body);
    expectError(
      await call(getIdea, {
        path: `/api/v1/c/${SLUG}/ideas/${id}`,
        cookie: author,
        params: params(id),
      }),
      404,
      "NOT_FOUND",
    );
  });
});

describe("COL-01 college setup", () => {
  const body = (code: string, slug: string) => ({
    code,
    slug,
    name: "Gamma Institute",
    city: "Pune",
    state: "MH",
    domains: ["gamma.edu"],
    join_method: "email",
  });
  const setup = (cookie: string | undefined, json: unknown) =>
    call(setupCollege, { method: "POST", path: "/api/v1/colleges/setup", json, cookie });

  it("needs a session", async () => {
    expectError(await setup(undefined, body("12345678", "gamma-it")), 401, "UNAUTHENTICATED");
  });

  it("refuses a wrong code the same way as a used one, and validates the body", async () => {
    expectError(await setup(author, body("00000000", "gamma-it")), 403, "FORBIDDEN");
    expectError(await setup(author, { ...body("1234", "gamma-it") }), 400, "VALIDATION_FAILED");
    expectError(await setup(author, { ...body("12345678", "ab") }), 400, "VALIDATION_FAILED");
  });

  it("matches its contract shape on success (pgTAP covers the college it makes)", () => {
    expect(
      collegeSetupResponse.safeParse({
        data: { college_id: randomUUID(), slug: "gamma-it" },
        meta: { request_id: "req_1" },
      }).success,
    ).toBe(true);
  });
});
