import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { errorEnvelope, skillsPutResponse, teamPostListResponse } from "@/contracts";
import { POST as otpRequest } from "@/app/api/v1/auth/otp/request/route";
import { POST as otpVerify } from "@/app/api/v1/auth/otp/verify/route";
import { GET as listAnnouncements } from "@/app/api/v1/c/[slug]/announcements/route";
import { GET as listPosts, POST as createPost } from "@/app/api/v1/c/[slug]/team-posts/route";
import { GET as myJoinRequests } from "@/app/api/v1/c/[slug]/me/join-requests/route";
import { GET as publicCollege } from "@/app/api/v1/colleges/public/[slug]/route";
import { POST as uploadAvatar } from "@/app/api/v1/me/avatar/route";
import { POST as avatarUploadUrl } from "@/app/api/v1/me/avatar/upload-url/route";
import { GET as mySkills, PUT as putSkills } from "@/app/api/v1/me/skills/route";
import { GET as searchSkills } from "@/app/api/v1/skills/route";
import { GET as getReminders } from "@/app/api/v1/me/reminder-settings/route";
import { adminClient } from "@/server/admin/supabase-admin";
import {
  call,
  clearInbox,
  clearRateLimits,
  expectMatches,
  signIn,
  APP_URL,
  type Result,
} from "./helpers";

const routes = { request: otpRequest, verify: otpVerify };
const admin = adminClient();
const SLUG = "alpha";
const TS_SKILL = "88888888-8888-4888-8888-888888888888";
const REACT_SKILL = "88888888-8888-4888-8888-888888888889";
const cookies: Record<string, string> = {};
const ids: Record<string, string> = {};
const uploaded: string[] = [];

const expectError = (result: Result, status: number, code: string) => {
  expect(result.status).toBe(status);
  expectMatches(errorEnvelope, result.body);
  expect(result.body.error.code).toBe(code);
};

const PNG = new Uint8Array([
  0x89,
  0x50,
  0x4e,
  0x47,
  0x0d,
  0x0a,
  0x1a,
  0x0a,
  ...new Array(64).fill(0),
]);

async function sendBytes(
  handler: unknown,
  who: string,
  bytes: Uint8Array | ReadableStream<Uint8Array> | null,
  headers: Record<string, string> = {},
) {
  const request = new Request(`${APP_URL}/api/v1/me/avatar`, {
    method: "POST",
    headers: { cookie: cookies[who]!, origin: APP_URL, "x-forwarded-for": "10.9.9.9", ...headers },
    body: bytes as BodyInit | null,
    ...(bytes && !(bytes instanceof Uint8Array) ? { duplex: "half" } : {}),
  } as RequestInit);
  const response = await (handler as (r: Request) => Promise<Response>)(request);
  const text = await response.text();
  return {
    status: response.status,
    body: text ? JSON.parse(text) : null,
    headers: response.headers,
  } as Result;
}

beforeAll(async () => {
  await clearInbox();
  await clearRateLimits();
  for (const [who, email] of Object.entries({
    student: "student1@alpha.test",
    classmate: "student2@alpha.test",
    owner: "student3@alpha.test",
    beta: "student1@beta.test",
  })) {
    const session = await signIn(routes, email);
    cookies[who] = session.cookie;
    ids[who] = session.userId;
  }
}, 120_000);

beforeEach(async () => {
  await clearRateLimits();
});

afterAll(async () => {
  if (uploaded.length) await admin.storage.from("avatars").remove(uploaded);
  await admin.from("profiles").update({ avatar_path: null }).eq("user_id", ids.student!);
  await admin.from("user_skills").delete().eq("user_id", ids.student!);
  const { data: college } = await admin.from("colleges").select("id").eq("slug", SLUG).single();
  const { data: settings } = await admin
    .from("college_settings")
    .select("features")
    .eq("college_id", college!.id)
    .single();
  const features = { ...(settings!.features as Record<string, unknown>) };
  delete features.campus;
  delete features.collaborate;
  await admin.from("college_settings").update({ features }).eq("college_id", college!.id);
}, 120_000);

// ---------------------------------------------------------------------------
describe("college tabs switched off are enforced by the API", () => {
  async function withFlag(flag: "campus" | "collaborate", run: () => Promise<void>) {
    const { data: college } = await admin.from("colleges").select("id").eq("slug", SLUG).single();
    const { data: settings } = await admin
      .from("college_settings")
      .select("features")
      .eq("college_id", college!.id)
      .single();
    const before = settings!.features as Record<string, unknown>;
    try {
      await admin
        .from("college_settings")
        .update({ features: { ...before, [flag]: false } })
        .eq("college_id", college!.id);
      await run();
    } finally {
      await admin
        .from("college_settings")
        .update({ features: before })
        .eq("college_id", college!.id);
    }
  }
  const get = (handler: unknown, who: string, path: string) =>
    call(handler, { path, cookie: cookies[who], params: { slug: SLUG } });

  it("Collaborate off: Team Finder answers 404 FEATURE_DISABLED for members, and works again when on", async () => {
    const on = await get(listPosts, "student", `/api/v1/c/${SLUG}/team-posts`);
    expect(on.status).toBe(200);
    expectMatches(teamPostListResponse, on.body);
    await withFlag("collaborate", async () => {
      expectError(
        await get(listPosts, "student", `/api/v1/c/${SLUG}/team-posts`),
        404,
        "FEATURE_DISABLED",
      );
      expectError(
        await get(myJoinRequests, "student", `/api/v1/c/${SLUG}/me/join-requests`),
        404,
        "FEATURE_DISABLED",
      );
      expectError(
        await call(createPost, {
          method: "POST",
          path: `/api/v1/c/${SLUG}/team-posts`,
          cookie: cookies.student,
          params: { slug: SLUG },
          headers: { "idempotency-key": randomUUID() },
          json: {
            kind: "project",
            title: "Hello world team",
            roles: [{ role_name: "Dev", slots: 1 }],
          },
        }),
        404,
        "FEATURE_DISABLED",
      );
      const pub = await call(publicCollege, {
        path: "/api/v1/colleges/public/alpha",
        params: { slug: SLUG },
      });
      expect(pub.body.data.modules.collaborate).toBe(false);
    });
    expect((await get(listPosts, "student", `/api/v1/c/${SLUG}/team-posts`)).status).toBe(200);
  });

  it("Campus off: announcements answer 404 FEATURE_DISABLED; other tabs keep working", async () => {
    expect(
      (await get(listAnnouncements, "student", `/api/v1/c/${SLUG}/announcements`)).status,
    ).toBe(200);
    await withFlag("campus", async () => {
      expectError(
        await get(listAnnouncements, "student", `/api/v1/c/${SLUG}/announcements`),
        404,
        "FEATURE_DISABLED",
      );
      expect((await get(listPosts, "student", `/api/v1/c/${SLUG}/team-posts`)).status).toBe(200);
    });
  });

  it("a person of another college still gets plain 404 NOT_FOUND, not a hint about tabs", async () => {
    await withFlag("collaborate", async () => {
      expectError(await get(listPosts, "beta", `/api/v1/c/${SLUG}/team-posts`), 404, "NOT_FOUND");
    });
  });
});

// ---------------------------------------------------------------------------
describe("sign in cannot be started from another website", () => {
  it("OTP request and verify refuse a foreign Origin (403) and still work from our own", async () => {
    for (const [handler, path, json] of [
      [otpRequest, "/api/v1/auth/otp/request", { email: "someone@alpha.test" }],
      [otpVerify, "/api/v1/auth/otp/verify", { email: "someone@alpha.test", code: "123456" }],
    ] as const) {
      expectError(
        await call(handler, {
          method: "POST",
          path,
          json,
          headers: { origin: "https://evil.example" },
        }),
        403,
        "FORBIDDEN",
      );
    }
    const own = await call(otpVerify, {
      method: "POST",
      path: "/api/v1/auth/otp/verify",
      json: { email: "nobody@alpha.test", code: "123456" },
    });
    expect(own.status).not.toBe(403);
  });
});

// ---------------------------------------------------------------------------
describe("read limit: 300 a minute per person", () => {
  it("the 301st read in a minute is RATE_LIMITED with Retry-After; writes have their own counter", async () => {
    const read = () =>
      call(getReminders, { path: "/api/v1/me/reminder-settings", cookie: cookies.classmate });
    await clearRateLimits();
    // in groups of 20 at the same time (a real browser never sends 300 at once)
    const first: Result[] = [];
    for (let group = 0; group < 15; group++)
      first.push(...(await Promise.all(Array.from({ length: 20 }, read))));
    expect(first.every((r) => r.status === 200)).toBe(true);
    const over = await read();
    expectError(over, 429, "RATE_LIMITED");
    expect(Number(over.headers.get("retry-after"))).toBeGreaterThan(0);
    // another person is not affected
    expect(
      (await call(getReminders, { path: "/api/v1/me/reminder-settings", cookie: cookies.student }))
        .status,
    ).toBe(200);
  }, 60_000);
});

// ---------------------------------------------------------------------------
describe("PRF-04 avatar upload (follow-ups from the PR 25 review)", () => {
  it("a real PNG is stored in the person's own folder and the profile points to it", async () => {
    const result = await sendBytes(uploadAvatar, "student", PNG, { "content-type": "image/png" });
    expect(result.status).toBe(200);
    expect(result.body.data.avatar_url).toContain(`/avatars/${ids.student}/`);
    const { data: profile } = await admin
      .from("profiles")
      .select("avatar_path")
      .eq("user_id", ids.student!)
      .single();
    expect(profile!.avatar_path).toMatch(new RegExp(`^${ids.student}/\\d+-avatar\\.png$`));
    uploaded.push(profile!.avatar_path!);
    const { data: listed } = await admin.storage.from("avatars").list(ids.student!);
    expect((listed ?? []).length).toBeGreaterThanOrEqual(1);
  });

  it("the same file as a multipart form field works too", async () => {
    const form = new FormData();
    form.append("file", new Blob([PNG], { type: "image/png" }), "me.png");
    const request = new Request(`${APP_URL}/api/v1/me/avatar`, {
      method: "POST",
      headers: { cookie: cookies.student!, origin: APP_URL, "x-forwarded-for": "10.9.9.8" },
      body: form,
    });
    const response = await uploadAvatar(request);
    expect(response.status).toBe(200);
    const { data: profile } = await admin
      .from("profiles")
      .select("avatar_path")
      .eq("user_id", ids.student!)
      .single();
    uploaded.push(profile!.avatar_path!);
  });

  it("refuses SVG, scripts hidden in an image name, text pretending to be PNG and an empty body", async () => {
    const svg = new TextEncoder().encode(
      '<svg xmlns="http://www.w3.org/2000/svg"><circle r="10"/></svg>',
    );
    expectError(
      await sendBytes(uploadAvatar, "student", svg, { "content-type": "image/svg+xml" }),
      415,
      "UNSUPPORTED_MEDIA_TYPE",
    );
    expectError(
      await sendBytes(uploadAvatar, "student", new TextEncoder().encode("I am not an image"), {
        "content-type": "image/png",
      }),
      415,
      "UNSUPPORTED_MEDIA_TYPE",
    );
    expectError(
      await sendBytes(uploadAvatar, "student", new Uint8Array(), { "content-type": "image/png" }),
      400,
      "VALIDATION_FAILED",
    );
  });

  it("cuts a body that is too big while reading it: a lying Content-Length, and a stream with none", async () => {
    expectError(
      await sendBytes(uploadAvatar, "student", PNG, {
        "content-type": "image/png",
        "content-length": String(50 * 1024 * 1024),
      }),
      413,
      "PAYLOAD_TOO_LARGE",
    );
    let pulled = 0;
    const endless = new ReadableStream<Uint8Array>({
      pull(controller) {
        pulled += 1;
        controller.enqueue(new Uint8Array(256 * 1024));
        if (pulled > 200) controller.close();
      },
    });
    expectError(
      await sendBytes(uploadAvatar, "student", endless, {
        "content-type": "application/octet-stream",
      }),
      413,
      "PAYLOAD_TOO_LARGE",
    );
    // it stopped reading long before the 50 MB the sender had ready
    expect(pulled).toBeLessThan(30);
  });

  it("the bucket itself refuses a signed upload of a non-image or an oversized file", async () => {
    const link = await call(avatarUploadUrl, {
      method: "POST",
      path: "/api/v1/me/avatar/upload-url",
      cookie: cookies.student,
      json: { file_name: "me.png", content_type: "image/png", file_size: 1000 },
    });
    expect(link.status).toBe(200);
    expect(link.body.data.path.startsWith(`${ids.student}/`)).toBe(true);
    const url = new URL(link.body.data.upload_url);
    const put = (blob: Blob) => {
      const form = new FormData();
      form.append("cacheControl", "3600");
      form.append("", blob);
      return fetch(url, { method: "PUT", body: form, headers: { "x-upsert": "false" } });
    };
    const html = await put(
      new Blob(["<html><script>alert(1)</script></html>"], { type: "text/html" }),
    );
    expect(html.status).toBeGreaterThanOrEqual(400);
    const big = await put(new Blob([new Uint8Array(3 * 1024 * 1024)], { type: "image/png" }));
    expect(big.status).toBeGreaterThanOrEqual(400);
  });

  it("nobody can write into another person's folder", async () => {
    const link = await call(avatarUploadUrl, {
      method: "POST",
      path: "/api/v1/me/avatar/upload-url",
      cookie: cookies.classmate,
      json: { file_name: "x.png", content_type: "image/png", file_size: 1000 },
    });
    expect(link.body.data.path.startsWith(`${ids.classmate}/`)).toBe(true);
    expect(link.body.data.path.startsWith(`${ids.student}/`)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
describe("PRF-02 skills: replaced in one transaction", () => {
  const put = (json: unknown) =>
    call(putSkills, { method: "PUT", path: "/api/v1/me/skills", cookie: cookies.student, json });
  const mine = async () => {
    const result = await call(mySkills, { path: "/api/v1/me/skills", cookie: cookies.student });
    return (result.body.data.skills as { skill_id: string }[]).map((s) => s.skill_id).sort();
  };

  it("a bad list leaves the old list as it was; a good list replaces it", async () => {
    const ok = await put({ skills: [{ skill_id: TS_SKILL, level: 3 }] });
    expect(ok.status).toBe(200);
    expectMatches(skillsPutResponse, ok.body);
    expect(await mine()).toEqual([TS_SKILL]);

    const bad = await put({
      skills: [
        { skill_id: REACT_SKILL, level: 4 },
        { skill_id: randomUUID(), level: 2 },
      ],
    });
    expectError(bad, 400, "VALIDATION_FAILED");
    expect(await mine()).toEqual([TS_SKILL]);

    expect((await put({ skills: [{ skill_id: REACT_SKILL, level: 4 }] })).status).toBe(200);
    expect(await mine()).toEqual([REACT_SKILL]);
    expect((await put({ skills: [] })).status).toBe(200);
    expect(await mine()).toEqual([]);
  });

  it("skill search treats % and _ as plain characters and the write limit applies", async () => {
    const find = (q: string) =>
      call(searchSkills, {
        path: `/api/v1/skills?q=${encodeURIComponent(q)}`,
        cookie: cookies.student,
      });
    expect((await find("%")).body.data).toEqual([]);
    expect((await find("_")).body.data).toEqual([]);
    expect((await find("type")).body.data.map((s: { name: string }) => s.name)).toContain(
      "TypeScript",
    );
    await clearRateLimits();
    let last: Result | undefined;
    for (let i = 0; i < 60; i++) last = await put({ skills: [] });
    expect(last!.status).toBe(200);
    expectError(await put({ skills: [] }), 429, "RATE_LIMITED");
  });
});
