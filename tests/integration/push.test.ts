import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { errorEnvelope, pushResponse } from "@/contracts";
import { POST as otpRequest } from "@/app/api/v1/auth/otp/request/route";
import { POST as otpVerify } from "@/app/api/v1/auth/otp/verify/route";
import { POST as pushInternal } from "@/app/api/internal/push/route";
import { DELETE as unsubscribe, POST as subscribe } from "@/app/api/v1/me/push/route";
import { POST as testAlert } from "@/app/api/v1/me/push/test/route";
import { adminClient } from "@/server/admin/supabase-admin";
import { call, clearInbox, clearRateLimits, expectMatches, signIn } from "./helpers";

const routes = { request: otpRequest, verify: otpVerify };
const admin = adminClient();
const SECRET = "test-cron-secret-0123456789abcdef";
const endpoint = `https://push.example/${randomUUID()}`;
const keys = { p256dh: "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA", auth: "tBHItJI5svbpez7KI4CCXg" };
let cookie = "";
let otherCookie = "";
let userId = "";

beforeAll(async () => {
  process.env.CRON_SECRET = SECRET;
  await clearInbox();
  await clearRateLimits();
  const session = await signIn(routes, "student1@alpha.test");
  cookie = session.cookie;
  userId = session.userId;
  otherCookie = (await signIn(routes, "student2@alpha.test")).cookie;
}, 120_000);

afterAll(async () => {
  await admin.from("push_subscriptions").delete().eq("endpoint", endpoint);
  delete process.env.CRON_SECRET;
}, 60_000);

const post = (json: unknown, who = cookie) =>
  call(subscribe, { method: "POST", path: "/api/v1/me/push", json, cookie: who });
const del = (json: unknown, who = cookie) =>
  call(unsubscribe, { method: "DELETE", path: "/api/v1/me/push", json, cookie: who });

describe("PSH-01 and PSH-02 alerts for a device", () => {
  it("a signed in person turns alerts on and off for a device", async () => {
    const on = await post({ endpoint, keys });
    expect(on.status).toBe(200);
    expectMatches(pushResponse, on.body);
    expect(on.body.data.enabled).toBe(true);
    const stored = await admin
      .from("push_subscriptions")
      .select("user_id")
      .eq("endpoint", endpoint);
    expect(stored.data).toEqual([{ user_id: userId }]);

    // The same device twice is stored once.
    expect((await post({ endpoint, keys })).status).toBe(200);
    const again = await admin.from("push_subscriptions").select("id").eq("endpoint", endpoint);
    expect(again.data).toHaveLength(1);

    const off = await del({ endpoint });
    expect(off.status).toBe(200);
    expect(off.body.data.enabled).toBe(false);
    const gone = await admin.from("push_subscriptions").select("id").eq("endpoint", endpoint);
    expect(gone.data).toHaveLength(0);
    // Turning off a device that is not stored is not an error.
    expect((await del({ endpoint })).status).toBe(200);
  });

  it("someone else cannot remove my device", async () => {
    await post({ endpoint, keys });
    await del({ endpoint }, otherCookie);
    const still = await admin.from("push_subscriptions").select("id").eq("endpoint", endpoint);
    expect(still.data).toHaveLength(1);
  });

  it("bad input is refused and signed out people are turned away", async () => {
    for (const bad of [
      {},
      { endpoint: "http://insecure.example/x", keys },
      { endpoint, keys: {} },
    ]) {
      const result = await post(bad);
      expect(result.status).toBe(400);
      expectMatches(errorEnvelope, result.body);
    }
    expect(
      (await call(subscribe, { method: "POST", path: "/api/v1/me/push", json: { endpoint, keys } }))
        .status,
    ).toBe(401);
  });
});

describe("PSH-03 test alert", () => {
  it("answers how many devices took it, and needs a sign in", async () => {
    const result = await call(testAlert, { method: "POST", path: "/api/v1/me/push/test", cookie });
    expect(result.status).toBe(200);
    expect(typeof result.body.data.sent).toBe("number");
    expect((await call(testAlert, { method: "POST", path: "/api/v1/me/push/test" })).status).toBe(
      401,
    );
  });
});

describe("SYS-03 the scheduler call", () => {
  it("needs the secret, and does nothing harmful when alerts are not set up", async () => {
    const denied = await call(pushInternal, { method: "POST", path: "/api/internal/push", cookie });
    expect(denied.status).toBe(401);
    const sent = await call(pushInternal, {
      method: "POST",
      path: "/api/internal/push",
      headers: { authorization: `Bearer ${SECRET}` },
    });
    expect(sent.status).toBe(200);
    expect(sent.body.data).toEqual({ sent: 0, dropped: 0 });
  });
});
