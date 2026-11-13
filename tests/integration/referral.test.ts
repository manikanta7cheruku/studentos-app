import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { POST as otpRequest } from "@/app/api/v1/auth/otp/request/route";
import { POST as otpVerify } from "@/app/api/v1/auth/otp/verify/route";
import { GET as getInvite } from "@/app/api/v1/me/invite/route";
import { POST as applyReferral } from "@/app/api/v1/me/referral/route";
import { adminClient } from "@/server/admin/supabase-admin";
import { call, clearInbox, clearRateLimits, signIn } from "./helpers";

// INV-01 and INV-02: an invite link counts a friend once, never yourself, and an unknown code changes nothing.

const routes = { request: otpRequest, verify: otpVerify };
const admin = adminClient();
let inviter = { cookie: "", userId: "" };
let friend = { cookie: "", userId: "" };
let other = { cookie: "", userId: "" };
let code = "";

const invited = async () =>
  (await call(getInvite, { path: "/api/v1/me/invite", cookie: inviter.cookie })).body.data
    .invited as number;
const join = (who: { cookie: string }, withCode: string) =>
  call(applyReferral, {
    method: "POST",
    path: "/api/v1/me/referral",
    json: { code: withCode },
    cookie: who.cookie,
  });

beforeAll(async () => {
  await clearInbox();
  await clearRateLimits();
  inviter = await signIn(routes, "student1@alpha.test");
  friend = await signIn(routes, "student2@alpha.test");
  other = await signIn(routes, "student3@alpha.test");
  // A clean start: nobody has joined through anyone yet.
  await admin
    .from("referrals")
    .delete()
    .in("referred_id", [friend.userId, other.userId, inviter.userId]);
  code = (await call(getInvite, { path: "/api/v1/me/invite", cookie: inviter.cookie })).body.data
    .code;
}, 120_000);

afterAll(async () => {
  await admin
    .from("referrals")
    .delete()
    .in("referred_id", [friend.userId, other.userId, inviter.userId]);
}, 60_000);

describe("invite friends", () => {
  it("gives a code and counts a friend who joins through it, once", async () => {
    expect(code).toMatch(/^[a-z0-9]{4,20}$/);
    const before = await invited();
    const first = await join(friend, code);
    expect(first.status).toBe(200);
    expect(first.body.data.applied).toBe(true);
    expect(await invited()).toBe(before + 1);
    // The same friend again, or with another link, is not counted twice.
    expect((await join(friend, code)).body.data.applied).toBe(false);
    expect(await invited()).toBe(before + 1);
  });

  it("does not count yourself, and ignores an unknown code", async () => {
    const before = await invited();
    expect((await join(inviter, code)).body.data.applied).toBe(false);
    expect((await join(other, "nosuchcode1")).body.data.applied).toBe(false);
    expect(await invited()).toBe(before);
  });

  it("a second friend adds one more", async () => {
    const before = await invited();
    expect((await join(other, code)).body.data.applied).toBe(true);
    expect(await invited()).toBe(before + 1);
  });
});
