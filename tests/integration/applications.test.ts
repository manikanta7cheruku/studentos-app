import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  applicationDeleteResponse,
  applicationListResponse,
  applicationResponse,
  errorEnvelope,
} from "@/contracts";
import { POST as otpRequest } from "@/app/api/v1/auth/otp/request/route";
import { POST as otpVerify } from "@/app/api/v1/auth/otp/verify/route";
import { GET as listApps, POST as createApp } from "@/app/api/v1/me/applications/route";
import {
  DELETE as deleteApp,
  GET as getApp,
  PATCH as patchApp,
} from "@/app/api/v1/me/applications/[id]/route";
import { POST as changeStatus } from "@/app/api/v1/me/applications/[id]/status/route";
import { adminClient } from "@/server/admin/supabase-admin";
import { call, clearInbox, clearRateLimits, expectMatches, randomEmail, signIn } from "./helpers";

// APP-01 to APP-04: the application tracker. Private to the person.

const routes = { request: otpRequest, verify: otpVerify };
const admin = adminClient();
const createdEmails: string[] = [];

async function newUser(prefix = "trk") {
  const email = randomEmail(prefix);
  createdEmails.push(email);
  const session = await signIn(routes, email);
  return { cookie: session.cookie, userId: session.userId };
}

type Json = Record<string, unknown>;
const create = (cookie: string | undefined, json: unknown, key: string = randomUUID()) =>
  call(createApp, {
    method: "POST",
    path: "/api/v1/me/applications",
    json,
    cookie,
    headers: { "idempotency-key": key },
  });
const list = (cookie: string | undefined, query = "") =>
  call(listApps, { path: `/api/v1/me/applications${query}`, cookie });
const one = (cookie: string | undefined, id: string) =>
  call(getApp, { path: `/api/v1/me/applications/${id}`, cookie, params: { id } });
const patch = (cookie: string, id: string, json: unknown, version?: number) =>
  call(patchApp, {
    method: "PATCH",
    path: `/api/v1/me/applications/${id}`,
    json,
    cookie,
    params: { id },
    headers: version === undefined ? {} : { "if-match": String(version) },
  });
const status = (cookie: string, id: string, json: unknown, version?: number) =>
  call(changeStatus, {
    method: "POST",
    path: `/api/v1/me/applications/${id}/status`,
    json,
    cookie,
    params: { id },
    headers: version === undefined ? {} : { "if-match": String(version) },
  });
const remove = (cookie: string, id: string) =>
  call(deleteApp, {
    method: "DELETE",
    path: `/api/v1/me/applications/${id}`,
    cookie,
    params: { id },
  });

function expectError(result: { status: number; body: unknown }, code: number, name: string) {
  expect(result.status).toBe(code);
  expectMatches(errorEnvelope, result.body);
  expect((result.body as { error: { code: string } }).error.code).toBe(name);
}

const base = { company: "Acme Robotics", role_title: "Frontend intern" };

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

describe("a session is needed", () => {
  it("answers 401 to everything without one", async () => {
    expectError(await list(undefined), 401, "UNAUTHENTICATED");
    expectError(await create(undefined, base), 401, "UNAUTHENTICATED");
    expectError(await one(undefined, randomUUID()), 401, "UNAUTHENTICATED");
  });
});

describe("APP-01 create", () => {
  it("makes an application with a first event, and a retry with the same key returns the first answer", async () => {
    const user = await newUser();
    const key = randomUUID();
    const created = await create(
      user.cookie,
      {
        ...base,
        source_url: "https://acme.example/jobs/1",
        deadline: "2027-01-15",
        notes: "A note",
      },
      key,
    );
    expect(created.status).toBe(201);
    expectMatches(applicationResponse, created.body);
    const app = created.body.data as Json & { events: Json[] };
    expect(app).toMatchObject({ company: "Acme Robotics", status: "saved", version: 1 });
    expect(app.events).toHaveLength(1);
    expect(app.events[0]).toMatchObject({ from_status: null, to_status: "saved" });

    const replay = await create(
      user.cookie,
      {
        ...base,
        source_url: "https://acme.example/jobs/1",
        deadline: "2027-01-15",
        notes: "A note",
      },
      key,
    );
    expect(replay.headers.get("idempotent-replay")).toBe("true");
    expect((replay.body.data as Json).id).toBe(app.id);
    expect(((await list(user.cookie)).body.data as Json[]).length).toBe(1);
  });

  it("fills the applied date when the status is applied", async () => {
    const user = await newUser();
    const created = await create(user.cookie, { ...base, status: "applied" });
    expect((created.body.data as Json).applied_on).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("explains a bad link, a missing company, an unknown status, a bad date and extra fields", async () => {
    const user = await newUser();
    for (const body of [
      { ...base, source_url: "http://not-https.example" },
      { role_title: "x" },
      { ...base, status: "dreaming" },
      { ...base, deadline: "next week" },
      { ...base, version: 5 },
    ]) {
      expectError(await create(user.cookie, body), 400, "VALIDATION_FAILED");
    }
  });

  it("allows a deadline in the past, and refuses an opportunity the person cannot see", async () => {
    const user = await newUser();
    expect((await create(user.cookie, { ...base, deadline: "2020-01-01" })).status).toBe(201);
    expectError(
      await create(user.cookie, { ...base, opportunity_id: randomUUID() }),
      404,
      "NOT_FOUND",
    );
  });
});

describe("APP-02 list", () => {
  it("lists only my own, filters by status, searches, and sorts by deadline with no deadline last", async () => {
    const user = await newUser();
    const other = await newUser();
    await create(user.cookie, { ...base, company: "Zeta", deadline: "2027-03-01" });
    await create(user.cookie, {
      ...base,
      company: "Alpha Labs",
      status: "applied",
      deadline: "2027-02-01",
    });
    await create(user.cookie, { ...base, company: "Midnight" });
    await create(other.cookie, { ...base, company: "Not Mine" });

    const all = await list(user.cookie);
    expect(all.status).toBe(200);
    expectMatches(applicationListResponse, all.body);
    const names = (all.body.data as { company: string }[]).map((a) => a.company);
    expect(names).toHaveLength(3);
    expect(names).not.toContain("Not Mine");

    const applied = await list(user.cookie, "?status=applied");
    expect((applied.body.data as { company: string }[]).map((a) => a.company)).toEqual([
      "Alpha Labs",
    ]);

    const sorted = await list(user.cookie, "?sort=deadline");
    expect((sorted.body.data as { company: string }[]).map((a) => a.company)).toEqual([
      "Alpha Labs",
      "Zeta",
      "Midnight",
    ]);

    const found = await list(user.cookie, "?q=midni");
    expect((found.body.data as { company: string }[]).map((a) => a.company)).toEqual(["Midnight"]);
    // Characters that mean something in a filter do not change the query.
    expect((await list(user.cookie, "?q=%25%2C(")).status).toBe(200);
    expectError(await list(user.cookie, "?status=nope"), 400, "VALIDATION_FAILED");
  });
});

describe("APP-03 read, edit, delete", () => {
  it("reads one with its history, edits with a version check, and deletes", async () => {
    const user = await newUser();
    const created = (await create(user.cookie, base)).body.data as Json;
    const id = created.id as string;

    const read = await one(user.cookie, id);
    expect(read.status).toBe(200);
    expectMatches(applicationResponse, read.body);

    const edited = await patch(
      user.cookie,
      id,
      { notes: "Phone screen Monday", deadline: "2027-02-02" },
      1,
    );
    expect(edited.status).toBe(200);
    expect(edited.body.data).toMatchObject({ notes: "Phone screen Monday", version: 2 });

    // A copy that is out of date is refused, and nothing changes.
    expectError(await patch(user.cookie, id, { notes: "stale" }, 1), 409, "VERSION_CONFLICT");
    expect(((await one(user.cookie, id)).body.data as Json).notes).toBe("Phone screen Monday");

    // null clears, and no If-Match means no check
    const cleared = await patch(user.cookie, id, { deadline: null });
    expect(cleared.body.data).toMatchObject({ deadline: null, version: 3 });
    expectError(await patch(user.cookie, id, {}), 400, "VALIDATION_FAILED");
    expectError(await patch(user.cookie, id, { status: "offer" }), 400, "VALIDATION_FAILED");
    const badMatch = await call(patchApp, {
      method: "PATCH",
      path: `/api/v1/me/applications/${id}`,
      json: { notes: "x" },
      cookie: user.cookie,
      params: { id },
      headers: { "if-match": "banana" },
    });
    expectError(badMatch, 400, "VALIDATION_FAILED");

    const removed = await remove(user.cookie, id);
    expect(removed.status).toBe(200);
    expectMatches(applicationDeleteResponse, removed.body);
    expectError(await one(user.cookie, id), 404, "NOT_FOUND");
    expectError(await remove(user.cookie, id), 404, "NOT_FOUND");
  });

  it("answers 404 to another person, for read, edit, status and delete", async () => {
    const owner = await newUser();
    const other = await newUser();
    const id = ((await create(owner.cookie, base)).body.data as Json).id as string;
    expectError(await one(other.cookie, id), 404, "NOT_FOUND");
    expectError(await patch(other.cookie, id, { notes: "x" }), 404, "NOT_FOUND");
    expectError(await status(other.cookie, id, { status: "offer" }), 404, "NOT_FOUND");
    expectError(await remove(other.cookie, id), 404, "NOT_FOUND");
    expect(((await one(owner.cookie, id)).body.data as Json).notes).toBe("");
  });

  it("answers 404 for an id that is not an id", async () => {
    const user = await newUser();
    expectError(await one(user.cookie, "not-a-uuid"), 404, "NOT_FOUND");
  });
});

describe("APP-04 status", () => {
  it("changes the status, writes an event each time, and keeps the history newest first", async () => {
    const user = await newUser();
    const created = (await create(user.cookie, base)).body.data as Json;
    const id = created.id as string;

    const applied = await status(user.cookie, id, { status: "applied", note: "Sent the form" }, 1);
    expect(applied.status).toBe(200);
    expectMatches(applicationResponse, applied.body);
    expect(applied.body.data).toMatchObject({ status: "applied", version: 2 });
    expect((applied.body.data as Json).applied_on).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    const interview = await status(user.cookie, id, { status: "interview" });
    const events = (
      interview.body.data as { events: { from_status: string | null; to_status: string }[] }
    ).events;
    expect(events.map((e) => e.to_status)).toEqual(["interview", "applied", "saved"]);
    expect(events[0]).toMatchObject({ from_status: "applied" });
  });

  it("refuses the same status, an old version, an unknown status, and an over long note", async () => {
    const user = await newUser();
    const id = ((await create(user.cookie, base)).body.data as Json).id as string;
    expectError(await status(user.cookie, id, { status: "saved" }), 409, "CONFLICT");
    expectError(await status(user.cookie, id, { status: "applied" }, 7), 409, "VERSION_CONFLICT");
    expectError(await status(user.cookie, id, { status: "ghosted" }), 400, "VALIDATION_FAILED");
    expectError(
      await status(user.cookie, id, { status: "applied", note: "x".repeat(501) }),
      400,
      "VALIDATION_FAILED",
    );
  });
});
