import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { POST as otpRequest } from "@/app/api/v1/auth/otp/request/route";
import { POST as otpVerify } from "@/app/api/v1/auth/otp/verify/route";
import { GET as suggest } from "@/app/api/v1/colleges/suggest/route";
import { GET as getProfile, PATCH as patchProfile } from "@/app/api/v1/me/profile/route";
import { LAUNCH_COLLEGES } from "@/lib/launch-colleges";
import { adminClient } from "@/server/admin/supabase-admin";
import { call, clearInbox, clearRateLimits, signIn } from "./helpers";

// The colleges offered in onboarding are saved on the profile like any typed name. This proves, against the real API and database,
// that every one of them is accepted (the "&" and the brackets included), comes back unchanged, and is found by the suggest search.

const routes = { request: otpRequest, verify: otpVerify };
const admin = adminClient();
let cookie = "";
let userId = "";
let before: string | null = null;

beforeAll(async () => {
  await clearInbox();
  await clearRateLimits();
  const session = await signIn(routes, "student3@alpha.test");
  cookie = session.cookie;
  userId = session.userId;
  before = (await admin.from("profiles").select("college_name").eq("user_id", userId).single()).data
    ?.college_name as string | null;
}, 120_000);

afterAll(async () => {
  await admin.from("profiles").update({ college_name: before }).eq("user_id", userId);
}, 60_000);

const save = (college_name: string) =>
  call(patchProfile, {
    method: "PATCH",
    path: "/api/v1/me/profile",
    json: { college_name },
    cookie,
  });

describe("the launch colleges work end to end", () => {
  for (const college of LAUNCH_COLLEGES) {
    it(`${college.short}: saved, read back unchanged and found by search`, async () => {
      await clearRateLimits();
      const saved = await save(college.name);
      expect(saved.status).toBe(200);
      const read = await call(getProfile, { path: "/api/v1/me/profile", cookie });
      expect(read.body.data.college_name).toBe(college.name);
      const found = await call(suggest, {
        path: `/api/v1/colleges/suggest?q=${encodeURIComponent(college.name.split(" ")[0]!.toLowerCase())}`,
        cookie,
      });
      expect(found.status).toBe(200);
      expect(found.body.data).toContain(college.name);
    });
  }

  it("a name someone typed themselves is saved too, and a nonsense one is refused", async () => {
    await clearRateLimits();
    expect((await save("Alpha Institute of Technology")).status).toBe(200);
    expect((await save("asdf")).status).toBe(400);
  });
});
