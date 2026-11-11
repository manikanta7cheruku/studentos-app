import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  boardListResponse,
  boardMessageListResponse,
  boardResponse,
  errorEnvelope,
  eventListResponse,
  eventResponse,
} from "@/contracts";
import { POST as otpRequest } from "@/app/api/v1/auth/otp/request/route";
import { POST as otpVerify } from "@/app/api/v1/auth/otp/verify/route";
import { GET as listEvents, POST as createEvent } from "@/app/api/v1/c/[slug]/events/route";
import { DELETE as cancelEvent } from "@/app/api/v1/c/[slug]/events/[id]/route";
import { PUT as rsvp } from "@/app/api/v1/c/[slug]/events/[id]/rsvp/route";
import { GET as listBoard, POST as createPost } from "@/app/api/v1/c/[slug]/board/route";
import { POST as setStatus } from "@/app/api/v1/c/[slug]/board/[id]/status/route";
import {
  GET as listMessages,
  POST as sendMessage,
} from "@/app/api/v1/c/[slug]/board/[id]/messages/route";
import { adminClient } from "@/server/admin/supabase-admin";
import { call, clearInbox, clearRateLimits, expectMatches, signIn } from "./helpers";

// EVT-01 to EVT-05 and BRD-01 to BRD-07 through the real route handlers and the local database.

const routes = { request: otpRequest, verify: otpVerify };
const admin = adminClient();
const SLUG = "alpha";
const events: string[] = [];
const posts: string[] = [];

type Json = Record<string, unknown>;
const params = (id: string) => ({ slug: SLUG, id }) as never;
const idem = () => ({ "idempotency-key": randomUUID() });

function expectError(result: { status: number; body: unknown }, code: number, name: string) {
  expect(result.status).toBe(code);
  expectMatches(errorEnvelope, result.body);
  expect((result.body as { error: { code: string } }).error.code).toBe(name);
}

let author: string;
let buyer: string;
let nosy: string;

beforeAll(async () => {
  await clearInbox();
  await clearRateLimits();
  author = (await signIn(routes, "student1@alpha.test")).cookie;
  buyer = (await signIn(routes, "student2@alpha.test")).cookie;
  nosy = (await signIn(routes, "student3@alpha.test")).cookie;
}, 120_000);

afterAll(async () => {
  if (events.length) await admin.from("events").delete().in("id", events);
  if (posts.length) await admin.from("board_posts").delete().in("id", posts);
});

describe("events", () => {
  const soon = () => new Date(Date.now() + 2 * 86_400_000).toISOString();

  it("needs a session, and refuses a start in the past", async () => {
    const none = await call(createEvent, {
      method: "POST",
      path: `/api/v1/c/${SLUG}/events`,
      json: { title: "Open mic night", starts_at: soon() },
      params: { slug: SLUG },
      headers: idem(),
    });
    expectError(none, 401, "UNAUTHENTICATED");
    const past = await call(createEvent, {
      method: "POST",
      path: `/api/v1/c/${SLUG}/events`,
      json: { title: "Open mic night", starts_at: new Date(Date.now() - 86_400_000).toISOString() },
      cookie: author,
      params: { slug: SLUG },
      headers: idem(),
    });
    expectError(past, 400, "VALIDATION_FAILED");
  });

  it("creates an event with a capacity of 2, lets people say they are going, and answers SLOTS_FULL", async () => {
    const created = await call(createEvent, {
      method: "POST",
      path: `/api/v1/c/${SLUG}/events`,
      json: { title: "Open mic night", starts_at: soon(), place: "Main hall", capacity: 2 },
      cookie: author,
      params: { slug: SLUG },
      headers: idem(),
    });
    expect(created.status).toBe(201);
    expectMatches(eventResponse, created.body);
    const event = created.body.data as Json;
    events.push(event.id as string);
    expect(event).toMatchObject({ going: true, going_count: 1, is_owner: true });

    const go = (cookie: string, going: boolean) =>
      call(rsvp, {
        method: "PUT",
        path: `/api/v1/c/${SLUG}/events/${event.id}/rsvp`,
        json: { going },
        cookie,
        params: params(event.id as string),
      });
    expect((await go(buyer, true)).body.data).toMatchObject({ going_count: 2, going: true });
    expect((await go(buyer, true)).body.data).toMatchObject({ going_count: 2 });
    expectError(await go(nosy, true), 409, "SLOTS_FULL");
    expect((await go(buyer, false)).body.data).toMatchObject({ going_count: 1, going: false });

    const list = await call(listEvents, {
      path: `/api/v1/c/${SLUG}/events?when=upcoming`,
      cookie: nosy,
      params: { slug: SLUG },
    });
    expectMatches(eventListResponse, list.body);
    expect((list.body.data as Json[]).some((item) => item.id === event.id)).toBe(true);

    expectError(
      await call(cancelEvent, {
        method: "DELETE",
        path: `/api/v1/c/${SLUG}/events/${event.id}`,
        cookie: buyer,
        params: params(event.id as string),
      }),
      403,
      "FORBIDDEN",
    );
    const cancelled = await call(cancelEvent, {
      method: "DELETE",
      path: `/api/v1/c/${SLUG}/events/${event.id}`,
      cookie: author,
      params: params(event.id as string),
    });
    expect(cancelled.body.data).toMatchObject({ status: "cancelled" });
  });
});

describe("the board", () => {
  const post = (cookie: string, json: unknown) =>
    call(createPost, {
      method: "POST",
      path: `/api/v1/c/${SLUG}/board`,
      json,
      cookie,
      params: { slug: SLUG },
      headers: idem(),
    });

  it("refuses a kind from the other board and a price on a lost thing", async () => {
    expectError(
      await post(author, { board: "lostfound", kind: "sell", title: "A wrong kind here" }),
      400,
      "VALIDATION_FAILED",
    );
    expectError(
      await post(author, {
        board: "lostfound",
        kind: "lost",
        title: "A price on a lost thing",
        price_inr: 100,
      }),
      400,
      "VALIDATION_FAILED",
    );
  });

  it("lists a listing, keeps messages private, and closes a post", async () => {
    const created = await post(author, {
      board: "market",
      kind: "sell",
      title: "Engineering Maths, 2nd year",
      price_inr: 350,
      place: "Hostel B",
    });
    expect(created.status).toBe(201);
    expectMatches(boardResponse, created.body);
    const item = created.body.data as Json;
    posts.push(item.id as string);
    expect(item).toMatchObject({ price_inr: 350, status: "open", is_owner: true });

    const list = await call(listBoard, {
      path: `/api/v1/c/${SLUG}/board?board=market`,
      cookie: buyer,
      params: { slug: SLUG },
    });
    expectMatches(boardListResponse, list.body);
    expect((list.body.data as Json[]).some((p) => p.id === item.id)).toBe(true);

    const send = (cookie: string, json: unknown) =>
      call(sendMessage, {
        method: "POST",
        path: `/api/v1/c/${SLUG}/board/${item.id}/messages`,
        json,
        cookie,
        params: params(item.id as string),
        headers: idem(),
      });
    const read = (cookie: string) =>
      call(listMessages, {
        path: `/api/v1/c/${SLUG}/board/${item.id}/messages`,
        cookie,
        params: params(item.id as string),
      });
    expect((await send(buyer, { body: "Is this still available?" })).status).toBe(201);
    expect((await send(nosy, { body: "Can I see it tomorrow?" })).status).toBe(201);

    const mine = await read(buyer);
    expectMatches(boardMessageListResponse, mine.body);
    expect(mine.body.data).toHaveLength(1);
    expect((await read(author)).body.data).toHaveLength(2);

    const buyerId = ((await read(author)).body.data as Json[]).find((m) => m.mine === false)!;
    const withUser = (buyerId.with_user as Json).user_id as string;
    expect((await send(author, { body: "Yes, come tonight.", to_user: withUser })).status).toBe(
      201,
    );
    expectError(await send(author, { body: "Who is this for?" }), 400, "VALIDATION_FAILED");

    const closed = await call(setStatus, {
      method: "POST",
      path: `/api/v1/c/${SLUG}/board/${item.id}/status`,
      json: { status: "resolved" },
      cookie: author,
      params: params(item.id as string),
    });
    expect(closed.body.data).toMatchObject({ status: "resolved" });
    expectError(await send(buyer, { body: "Too late" }), 409, "CONFLICT");
  });
});
