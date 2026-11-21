import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { POST as otpRequest } from "@/app/api/v1/auth/otp/request/route";
import { POST as otpVerify } from "@/app/api/v1/auth/otp/verify/route";
import { GET as gamesList, POST as gamesCreate } from "@/app/api/v1/c/[slug]/games/route";
import { GET as gameOne } from "@/app/api/v1/c/[slug]/games/[id]/route";
import { DELETE as gameLeave, POST as gameJoin } from "@/app/api/v1/c/[slug]/games/[id]/join/route";
import { POST as gameDecide } from "@/app/api/v1/c/[slug]/games/[id]/decision/route";
import { POST as gameCancel } from "@/app/api/v1/c/[slug]/games/[id]/cancel/route";
import { gameListResponse, gameResponse } from "@/contracts";
import { adminClient } from "@/server/admin/supabase-admin";
import { call, clearInbox, clearRateLimits, expectMatches, signIn } from "./helpers";

// GAM-01 to GAM-07: a game at a turf or court. People join, wait when it is full, get the place when someone drops out, ask when
// the host approves, and the host can decline, remove and cancel.

const routes = { request: otpRequest, verify: otpVerify };
const admin = adminClient();
const params = (id?: string) => ({ slug: "alpha", ...(id ? { id } : {}) });
let host = { cookie: "", userId: "" };
let second = { cookie: "", userId: "" };
let third = { cookie: "", userId: "" };

const in2Days = () => new Date(Date.now() + 2 * 86_400_000).toISOString();
const body = (extra: Record<string, unknown> = {}) => ({
  sport: "football",
  venue: "Greenfield Turf",
  area: "Gate 2",
  starts_at: in2Days(),
  hours: 1,
  capacity: 2,
  price_inr: 150,
  ...extra,
});
const create = (extra: Record<string, unknown> = {}, who = host) =>
  call(gamesCreate, {
    method: "POST",
    path: "/api/v1/c/alpha/games",
    params: params(),
    cookie: who.cookie,
    headers: { "idempotency-key": randomUUID() },
    json: body(extra),
  });
const get = (id: string, who: { cookie: string }) =>
  call(gameOne, { path: `/api/v1/c/alpha/games/${id}`, params: params(id), cookie: who.cookie });
const join = (id: string, who: { cookie: string }) =>
  call(gameJoin, {
    method: "POST",
    path: `/api/v1/c/alpha/games/${id}/join`,
    params: params(id),
    cookie: who.cookie,
  });
const leave = (id: string, who: { cookie: string }) =>
  call(gameLeave, {
    method: "DELETE",
    path: `/api/v1/c/alpha/games/${id}/join`,
    params: params(id),
    cookie: who.cookie,
  });
const decide = (
  id: string,
  who: { cookie: string },
  userId: string,
  decision: "accepted" | "declined" | "removed",
) =>
  call(gameDecide, {
    method: "POST",
    path: `/api/v1/c/alpha/games/${id}/decision`,
    params: params(id),
    cookie: who.cookie,
    json: { user_id: userId, decision },
  });
const cancel = (id: string, who: { cookie: string }) =>
  call(gameCancel, {
    method: "POST",
    path: `/api/v1/c/alpha/games/${id}/cancel`,
    params: params(id),
    cookie: who.cookie,
  });

beforeAll(async () => {
  await clearInbox();
  await clearRateLimits();
  host = await signIn(routes, "student1@alpha.test");
  second = await signIn(routes, "student2@alpha.test");
  third = await signIn(routes, "student3@alpha.test");
}, 120_000);

afterAll(async () => {
  await admin.from("games").delete().eq("author_id", host.userId);
}, 60_000);

describe("games", () => {
  it("sets up a game with the host already in, and checks the values", async () => {
    const made = await create();
    expect(made.status).toBe(201);
    expectMatches(gameResponse, made.body);
    expect(made.body.data).toMatchObject({
      is_host: true,
      joined_count: 1,
      capacity: 2,
      my_status: "joined",
      price_inr: 150,
    });
    expect(
      (await create({ starts_at: new Date(Date.now() - 3_600_000).toISOString() })).status,
    ).toBe(400);
    expect((await create({ capacity: 1 })).status).toBe(400);
    expect((await create({ venue: "ab" })).status).toBe(400);
  });

  it("an open game fills up, a full game has a waiting list, and a dropped place goes to the first in line", async () => {
    const id = (await create()).body.data.id as string;
    const one = await join(id, second);
    expect(one.status).toBe(200);
    expect(one.body.data.my_status).toBe("joined");
    expect(one.body.data.joined_count).toBe(2);
    const wait = await join(id, third);
    expect(wait.body.data.my_status).toBe("waitlist");
    expect(wait.body.data.my_place).toBe(1);
    // Asking again changes nothing.
    expect((await join(id, third)).body.data).toMatchObject({
      my_status: "waitlist",
      waitlist_count: 1,
    });

    const list = await call(gamesList, {
      path: "/api/v1/c/alpha/games?mine=true",
      params: params(),
      cookie: third.cookie,
    });
    expectMatches(gameListResponse, list.body);
    expect((list.body.data as { id: string }[]).some((game) => game.id === id)).toBe(true);

    // The host cannot leave their own game. A player who drops out frees the place for the one waiting.
    expect((await leave(id, host)).status).toBe(403);
    expect((await leave(id, second)).status).toBe(200);
    const after = await get(id, third);
    expect(after.body.data).toMatchObject({
      my_status: "joined",
      joined_count: 2,
      waitlist_count: 0,
    });
    // Someone who was never in cannot leave.
    expect((await leave(id, second)).status).toBe(404);
    const names = (after.body.data.players as { display_name: string }[]).length;
    expect(names).toBe(2);
  });

  it("a game the host approves: requests, accepting, declining and removing", async () => {
    const id = (await create({ join_mode: "approval", capacity: 2 })).body.data.id as string;
    expect((await join(id, second)).body.data.my_status).toBe("requested");
    // The one place is promised, so the next person waits.
    expect((await join(id, third)).body.data.my_status).toBe("waitlist");
    const seen = await get(id, host);
    expect(seen.body.data.requests).toHaveLength(2);
    expect(seen.body.data.requested_count).toBe(1);
    // Others do not see the requests.
    expect((await get(id, second)).body.data.requests).toHaveLength(0);

    // Only the host answers.
    expect((await decide(id, second, third.userId, "accepted")).status).toBe(403);
    const accepted = await decide(id, host, second.userId, "accepted");
    expect(accepted.status).toBe(200);
    expect(accepted.body.data.joined_count).toBe(2);
    // Every place is taken: the person waiting cannot be accepted until someone drops out.
    expect((await decide(id, host, third.userId, "accepted")).status).toBe(409);
    // Removing a player lets the next in line become a request again.
    const removed = await decide(id, host, second.userId, "removed");
    expect(removed.status).toBe(200);
    expect(removed.body.data.requested_count).toBe(1);
    expect((await decide(id, host, third.userId, "declined")).status).toBe(200);
    // Someone the host declined cannot come back.
    expect((await join(id, third)).status).toBe(403);
    expect((await join(id, second)).status).toBe(403);
  });

  it("only the host cancels, and nobody can join a cancelled game", async () => {
    const id = (await create()).body.data.id as string;
    await join(id, second);
    expect((await cancel(id, second)).status).toBe(403);
    const done = await cancel(id, host);
    expect(done.status).toBe(200);
    expect(done.body.data.status).toBe("cancelled");
    expect((await cancel(id, host)).status).toBe(409);
    expect((await join(id, third)).status).toBe(409);
    // The person who was in is told.
    const told = await admin
      .from("notifications")
      .select("type")
      .eq("user_id", second.userId)
      .eq("type", "game.cancelled");
    expect((told.data ?? []).length).toBeGreaterThan(0);
  });

  it("an unknown game is not found", async () => {
    expect((await get(randomUUID(), second)).status).toBe(404);
    expect((await join(randomUUID(), second)).status).toBe(404);
  });
});
