import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { POST as otpRequest } from "@/app/api/v1/auth/otp/request/route";
import { POST as otpVerify } from "@/app/api/v1/auth/otp/verify/route";
import { GET as people } from "@/app/api/v1/c/[slug]/people/route";
import { PUT as block, DELETE as unblock } from "@/app/api/v1/me/blocks/[userId]/route";
import { adminClient } from "@/server/admin/supabase-admin";
import { call, clearInbox, clearRateLimits, signIn } from "./helpers";

// PRF-05: the directory must really work against the database (it was broken behind mocked unit tests).
const routes = { request: otpRequest, verify: otpVerify };
const admin = adminClient();
const cookies: Record<string, string> = {};
const ids: Record<string, string> = {};

const list = (who: string, query = "") =>
  call(people, {
    path: `/api/v1/c/alpha/people${query}`,
    params: { slug: "alpha" },
    cookie: cookies[who],
  });

beforeAll(async () => {
  await clearInbox();
  await clearRateLimits();
  for (const [who, email] of Object.entries({
    student: "student1@alpha.test",
    classmate: "student2@alpha.test",
    betaStudent: "student1@beta.test",
  })) {
    const session = await signIn(routes, email);
    cookies[who] = session.cookie;
    ids[who] = session.userId;
  }
}, 120_000);

afterAll(async () => {
  await admin.from("blocks").delete().eq("blocker_id", ids.student!);
  await admin.from("profiles").update({ visibility: "college" }).eq("user_id", ids.classmate!);
  await admin.from("memberships").update({ profile_hidden_at: null }).eq("user_id", ids.classmate!);
});

describe("PRF-05 people directory", () => {
  it("a member sees active classmates of their own college only", async () => {
    const result = await list("student");
    expect(result.status).toBe(200);
    const seen = result.body.data.map((p: { user_id: string }) => p.user_id);
    expect(seen).toContain(ids.classmate);
    expect(seen).not.toContain(ids.betaStudent);
    expect(result.body.data[0]).toHaveProperty("display_name");
    expect(result.body.data[0]).not.toHaveProperty("email");
  });

  it("another college gets 404, nobody signed in gets 401", async () => {
    expect((await list("betaStudent")).status).toBe(404);
    expect((await list("nobody")).status).toBe(401);
  });

  it("search treats % and _ as plain characters", async () => {
    const all = await list("student", "?q=%25");
    expect(all.status).toBe(200);
    expect(all.body.data).toHaveLength(0);
  });

  it("a profile set to hidden, or hidden by a moderator, disappears from the list and comes back", async () => {
    await admin.from("profiles").update({ visibility: "hidden" }).eq("user_id", ids.classmate!);
    expect(
      (await list("student")).body.data.map((p: { user_id: string }) => p.user_id),
    ).not.toContain(ids.classmate);
    await admin.from("profiles").update({ visibility: "college" }).eq("user_id", ids.classmate!);
    await admin
      .from("memberships")
      .update({ profile_hidden_at: new Date().toISOString() })
      .eq("user_id", ids.classmate!);
    expect(
      (await list("student")).body.data.map((p: { user_id: string }) => p.user_id),
    ).not.toContain(ids.classmate);
    await admin
      .from("memberships")
      .update({ profile_hidden_at: null })
      .eq("user_id", ids.classmate!);
    expect((await list("student")).body.data.map((p: { user_id: string }) => p.user_id)).toContain(
      ids.classmate,
    );
  });

  it("blocking hides the classmate both ways, unblocking brings them back", async () => {
    const put = await call(block, {
      method: "PUT",
      path: `/api/v1/me/blocks/${ids.classmate}`,
      params: { userId: ids.classmate! },
      cookie: cookies.student,
    });
    expect(put.status).toBe(200);
    expect(
      (await list("student")).body.data.map((p: { user_id: string }) => p.user_id),
    ).not.toContain(ids.classmate);
    expect(
      (await list("classmate")).body.data.map((p: { user_id: string }) => p.user_id),
    ).not.toContain(ids.student);
    await call(unblock, {
      method: "DELETE",
      path: `/api/v1/me/blocks/${ids.classmate}`,
      params: { userId: ids.classmate! },
      cookie: cookies.student,
    });
    expect((await list("student")).body.data.map((p: { user_id: string }) => p.user_id)).toContain(
      ids.classmate,
    );
  });
});
