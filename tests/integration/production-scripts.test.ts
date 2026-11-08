import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { POST as otpRequest } from "@/app/api/v1/auth/otp/request/route";
import { POST as otpVerify } from "@/app/api/v1/auth/otp/verify/route";
import { GET as publicCollege } from "@/app/api/v1/colleges/public/[slug]/route";
import { GET as myMembership } from "@/app/api/v1/c/[slug]/me/membership/route";
import { GET as adminSettings } from "@/app/api/v1/c/[slug]/admin/settings/route";
import { adminClient } from "@/server/admin/supabase-admin";
import { call, clearInbox, clearRateLimits, randomEmail, signIn } from "./helpers";

// supabase/production/create-college.sql is the only way a real college is created (ADM-01 is not built).
// This test runs the script itself against the local database, so a change to the tables cannot break it unseen.
const routes = { request: otpRequest, verify: otpVerify };
const admin = adminClient();
const run = Math.random().toString(36).slice(2, 8);
const slug = `prod-${run}`;
const script = readFileSync(
  join(__dirname, "..", "..", "supabase", "production", "create-college.sql"),
  "utf8",
);

function runSql(sql: string): { ok: boolean; output: string } {
  try {
    const output = execFileSync(
      "docker",
      [
        "exec",
        "-i",
        "supabase_db_studentos-app",
        "psql",
        "-U",
        "postgres",
        "-d",
        "postgres",
        "-v",
        "ON_ERROR_STOP=1",
      ],
      { input: sql, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] },
    );
    return { ok: true, output };
  } catch (error) {
    const e = error as { stderr?: string; stdout?: string };
    return { ok: false, output: `${e.stderr ?? ""}${e.stdout ?? ""}` };
  }
}

const withValues = (email: string, s = slug) =>
  script
    .replace("v_slug text := 'my-college'", `v_slug text := '${s}'`)
    .replace("v_name text := 'My College Name'", "v_name text := 'Production Test College'")
    .replace(
      "v_domains text[] := array['mycollege.edu.in']",
      `v_domains text[] := array['${s}.edu.test']`,
    )
    .replace("v_admin_email text := 'admin@mycollege.edu.in'", `v_admin_email text := '${email}'`);

let email = "";
let adminCookie = "";
let userId = "";

const collegeId = async () =>
  (await admin.from("colleges").select("id").eq("slug", slug).single()).data!.id as string;

beforeAll(async () => {
  await clearInbox();
  await clearRateLimits();
  email = randomEmail("college-admin");
  const session = await signIn(routes, email);
  adminCookie = session.cookie;
  userId = session.userId;
}, 120_000);

afterAll(async () => {
  // The last admin of a college cannot be removed through the normal rules, so the clean up switches the triggers
  // off for this one transaction (this is a throwaway local database).
  runSql(`begin;
set session_replication_role = replica;
delete from public.memberships where college_id in (select id from public.colleges where slug like 'prod-${run}%');
delete from public.colleges where slug like 'prod-${run}%';
commit;`);
  await admin.auth.admin.deleteUser(userId);
});

describe("supabase/production/create-college.sql", () => {
  it("refuses when the admin has not signed in yet, and changes nothing", async () => {
    const result = runSql(withValues(`nobody-${run}@example.test`, `prod-${run}-x`));
    expect(result.ok).toBe(false);
    expect(result.output).toContain("Nobody has signed in");
    const { count } = await admin
      .from("colleges")
      .select("id", { count: "exact", head: true })
      .eq("slug", `prod-${run}-x`);
    expect(count).toBe(0);
  });

  it("creates the college, its domain and the first admin; the API then works for them", async () => {
    const result = runSql(withValues(email));
    expect(result.ok).toBe(true);

    const pub = await call(publicCollege, {
      path: `/api/v1/colleges/public/${slug}`,
      params: { slug },
    });
    expect(pub.status).toBe(200);
    expect(pub.body.data).toMatchObject({
      slug,
      name: "Production Test College",
      require_admin_approval: true,
    });
    expect(pub.body.data.allowed_methods).toEqual(["email_domain", "invite_code", "manual"]);
    expect(pub.body.data.modules).toEqual({ campus: true, collaborate: true, career: true });

    const membership = await call(myMembership, {
      path: `/api/v1/c/${slug}/me/membership`,
      params: { slug },
      cookie: adminCookie,
    });
    expect(membership.body.data.membership).toMatchObject({
      role: "college_admin",
      status: "active",
      verification_level: 3,
    });
    const settings = await call(adminSettings, {
      path: `/api/v1/c/${slug}/admin/settings`,
      params: { slug },
      cookie: adminCookie,
    });
    expect(settings.status).toBe(200);

    const id = await collegeId();
    const { data: domains } = await admin
      .from("college_domains")
      .select("domain")
      .eq("college_id", id);
    expect(domains).toEqual([{ domain: `${slug}.edu.test` }]);
    const audit = await admin.from("audit_logs").select("action").eq("college_id", id);
    expect(audit.data).toEqual([{ action: "college.created" }]);
  });

  it("run a second time it stops with a clear message and does not make a second college", () => {
    const result = runSql(withValues(email));
    expect(result.ok).toBe(false);
    expect(result.output).toContain("already exists");
  });

  it("refuses a reserved or badly formed slug (the table rules still apply)", () => {
    expect(runSql(withValues(email, "admin")).ok).toBe(false);
    expect(runSql(withValues(email, "Bad Slug!")).ok).toBe(false);
  });
});
