import { afterEach, describe, expect, it } from "vitest";
import { GET as googleStart } from "@/app/api/v1/auth/google/route";
import { GET as googleCallback } from "@/app/api/v1/auth/google/callback/route";
import { GET as profileGet } from "@/app/api/v1/me/profile/route";
import { POST as otpRequest } from "@/app/api/v1/auth/otp/request/route";
import { POST as otpVerify } from "@/app/api/v1/auth/otp/verify/route";
import { adminClient } from "@/server/admin/supabase-admin";
import { call, deleteTestUsers, randomEmail, signIn } from "./helpers";

// AUTH-05 and AUTH-06: Continue with Google. The local stack has Google switched off (it needs a Google client), so
// these tests check what the server does around Google: where it sends people, and that it never follows an unsafe
// `next` address. The real round trip to Google is checked by hand on staging (docs/PRODUCTION_SETUP.md).

const APP = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

afterEach(() => {
  delete process.env.NEXT_PUBLIC_GOOGLE_SIGNIN;
});

describe("AUTH-05 start", () => {
  it("goes back to sign in with a plain reason when Google sign in is not switched on", async () => {
    const result = await call(googleStart, { path: "/api/v1/auth/google?next=/c/alpha/campus" });
    expect(result.status).toBe(302);
    expect(result.headers.get("location")).toBe(`${APP}/signin?error=google_unavailable`);
  });

  it("when switched on, sends the browser to the Supabase address for Google and keeps the one time proof in a cookie", async () => {
    process.env.NEXT_PUBLIC_GOOGLE_SIGNIN = "enabled";
    const result = await call(googleStart, { path: "/api/v1/auth/google?next=/c/alpha/campus" });
    expect(result.status).toBe(302);
    const location = new URL(result.headers.get("location") ?? "");
    expect(location.pathname).toBe("/auth/v1/authorize");
    expect(location.searchParams.get("provider")).toBe("google");
    const back = new URL(location.searchParams.get("redirect_to") ?? "");
    expect(back.pathname).toBe("/api/v1/auth/google/callback");
    expect(back.searchParams.get("next")).toBe("/c/alpha/campus");
    expect(location.searchParams.get("code_challenge")).toBeTruthy();
    expect(result.headers.get("set-cookie") ?? "").toContain("code-verifier");
  });

  it("drops a next address that leaves the app", async () => {
    process.env.NEXT_PUBLIC_GOOGLE_SIGNIN = "enabled";
    const result = await call(googleStart, {
      path: "/api/v1/auth/google?next=https://evil.example",
    });
    const location = new URL(result.headers.get("location") ?? "");
    const back = new URL(location.searchParams.get("redirect_to") ?? "");
    expect(back.searchParams.has("next")).toBe(false);
  });
});

describe("AUTH-06 callback", () => {
  it("without a code goes back to sign in", async () => {
    const result = await call(googleCallback, { path: "/api/v1/auth/google/callback" });
    expect(result.status).toBe(302);
    expect(result.headers.get("location")).toBe(`${APP}/signin?error=google_failed`);
  });

  it("when the person cancelled at Google goes back to sign in with that reason", async () => {
    const result = await call(googleCallback, {
      path: "/api/v1/auth/google/callback?error=access_denied",
    });
    expect(result.headers.get("location")).toBe(`${APP}/signin?error=google_cancelled`);
  });

  it("a wrong or reused code does not sign anybody in and sets no session cookie", async () => {
    const result = await call(googleCallback, {
      path: "/api/v1/auth/google/callback?code=not-a-real-code&next=https://evil.example",
    });
    expect(result.status).toBe(302);
    expect(result.headers.get("location")).toBe(`${APP}/signin?error=google_failed`);
    expect(result.headers.get("set-cookie") ?? "").not.toContain("sb-");
  });
});

describe("a Google user whose profile row is missing", () => {
  it("gets a profile made on the first read of GET /me/profile, so Me and Settings open", async () => {
    const email = randomEmail("goog");
    const session = await signIn({ request: otpRequest, verify: otpVerify }, email);
    await adminClient().from("profiles").delete().eq("user_id", session.userId);

    const result = await call(profileGet, { path: "/api/v1/me/profile", cookie: session.cookie });
    expect(result.status).toBe(200);
    expect((result.body as { data: { display_name: string } }).data.display_name).toBe(
      email.split("@")[0],
    );
    await deleteTestUsers();
  });
});
