import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { POST as otpRequest } from "@/app/api/v1/auth/otp/request/route";
import { POST as otpVerify } from "@/app/api/v1/auth/otp/verify/route";
import {
  GET as threadGet,
  POST as threadSend,
} from "@/app/api/v1/c/[slug]/messages/[userId]/route";
import { PUT as timerPut } from "@/app/api/v1/c/[slug]/messages/[userId]/timer/route";
import { GET as settingsGet, PUT as settingsPut } from "@/app/api/v1/me/message-settings/route";
import { dmTimerResponse, messageSettingsResponse } from "@/contracts";
import { adminClient } from "@/server/admin/supabase-admin";
import { call, clearInbox, clearRateLimits, expectMatches, signIn } from "./helpers";

// MSG-06 to MSG-08: how long a message stays after it is opened (1, 7 or 24 hours), per chat and as a default.

const routes = { request: otpRequest, verify: otpVerify };
const admin = adminClient();
let one = { cookie: "", userId: "" };
let two = { cookie: "", userId: "" };
let three = { cookie: "", userId: "" };

const hours = (from: string, to: string) =>
  Math.round(((new Date(to).getTime() - new Date(from).getTime()) / 3_600_000) * 10) / 10;
const params = (userId: string) => ({ slug: "alpha", userId });
const send = (from: { cookie: string }, to: string, body: string) =>
  call(threadSend, {
    method: "POST",
    path: `/api/v1/c/alpha/messages/${to}`,
    params: params(to),
    cookie: from.cookie,
    headers: { "idempotency-key": randomUUID() },
    json: { body },
  });
const open = (who: { cookie: string }, other: string) =>
  call(threadGet, {
    path: `/api/v1/c/alpha/messages/${other}`,
    params: params(other),
    cookie: who.cookie,
  });
const setTimer = (who: { cookie: string }, other: string, minutes: unknown) =>
  call(timerPut, {
    method: "PUT",
    path: `/api/v1/c/alpha/messages/${other}/timer`,
    params: params(other),
    cookie: who.cookie,
    json: { minutes },
  });
const setDefault = (who: { cookie: string }, minutes: unknown) =>
  call(settingsPut, {
    method: "PUT",
    path: "/api/v1/me/message-settings",
    cookie: who.cookie,
    json: { default_minutes: minutes },
  });

async function clean() {
  const ids = [one.userId, two.userId, three.userId];
  await admin.from("dm_threads").delete().in("user_a", ids).in("user_b", ids);
  await admin.from("dm_settings").delete().in("user_id", ids);
  await admin.from("follows").delete().in("follower_id", ids).in("followee_id", ids);
}

beforeAll(async () => {
  await clearInbox();
  await clearRateLimits();
  one = await signIn(routes, "student1@alpha.test");
  two = await signIn(routes, "student2@alpha.test");
  three = await signIn(routes, "student3@alpha.test");
  await clean();
  // Two people who follow each other can chat without a request.
  await admin.from("follows").insert([
    { follower_id: one.userId, followee_id: two.userId },
    { follower_id: two.userId, followee_id: one.userId },
  ]);
}, 120_000);

afterAll(async () => {
  await clean();
}, 60_000);

describe("message timer", () => {
  it("my default starts at 1 hour, can be 7 or 24 hours, and nothing else", async () => {
    const start = await call(settingsGet, {
      path: "/api/v1/me/message-settings",
      cookie: one.cookie,
    });
    expectMatches(messageSettingsResponse, start.body);
    expect(start.body.data.default_minutes).toBe(60);
    const set = await setDefault(one, 420);
    expect(set.status).toBe(200);
    expectMatches(messageSettingsResponse, set.body);
    expect(set.body.data.default_minutes).toBe(420);
    expect((await setDefault(one, 100)).status).toBe(400);
    expect((await setDefault(one, "a day")).status).toBe(400);
  });

  it("a new chat starts with the default of the person who writes first, and a message disappears on that timer", async () => {
    expect((await send(one, two.userId, "First hello")).status).toBe(201);
    const seen = await open(two, one.userId);
    expect(seen.body.data.disappear).toMatchObject({
      minutes: 420,
      set_by_name: null,
      can_change: true,
    });
    const message = (
      seen.body.data.messages as { body: string; opened_at: string; expires_at: string }[]
    )[0]!;
    expect(message.body).toBe("First hello");
    expect(hours(message.opened_at, message.expires_at)).toBe(7);
  });

  it("either person changes the timer, it only affects new messages, and the other person sees who changed it", async () => {
    const changed = await setTimer(two, one.userId, 1440);
    expect(changed.status).toBe(200);
    expectMatches(dmTimerResponse, changed.body);
    expect(changed.body.data).toMatchObject({ minutes: 1440, set_by_me: true });
    expect((await send(one, two.userId, "Second hello")).status).toBe(201);

    const forOne = await open(one, two.userId);
    expect(forOne.body.data.disappear).toMatchObject({ minutes: 1440, set_by_me: false });
    expect(forOne.body.data.disappear.set_by_name).toBeTruthy();

    const forTwo = await open(two, one.userId);
    const list = forTwo.body.data.messages as {
      body: string;
      opened_at: string;
      expires_at: string;
    }[];
    const first = list.find((m) => m.body === "First hello")!;
    const second = list.find((m) => m.body === "Second hello")!;
    // The old message keeps its 7 hours, the new one gets 24.
    expect(hours(first.opened_at, first.expires_at)).toBe(7);
    expect(hours(second.opened_at, second.expires_at)).toBe(24);
  });

  it("refuses a number that is not 1, 7 or 24 hours, and a chat that is not going", async () => {
    expect((await setTimer(one, two.userId, 5)).status).toBe(400);
    expect((await setTimer(one, two.userId, "1440")).status).toBe(400);
    // No conversation with this person yet
    expect((await setTimer(one, three.userId, 60)).status).toBe(409);
    // Someone who is not in the college chat
    expect((await setTimer(one, randomUUID(), 60)).status).toBe(404);
  });
});
