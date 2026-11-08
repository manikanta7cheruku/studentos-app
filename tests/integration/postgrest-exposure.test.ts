import { beforeAll, describe, expect, it } from "vitest";
import { accessTokenFor, clearInbox } from "./helpers";

// R5 gate: attack the database API (PostgREST) directly, the way someone who skips our Next.js code would.
// Everyone with the public anon key can send these requests. Row Level Security and table rights must hold.

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const ALPHA = "aaaaaaaa-0000-4000-8000-000000000001";
const BETA = "bbbbbbbb-0000-4000-8000-000000000001";
const STUDENT1_ALPHA = "aaaaaaaa-1000-4000-8000-000000000003";

const tokens: Record<string, string> = {};

async function rest(
  path: string,
  options: { token?: string; method?: string; body?: unknown } = {},
) {
  const response = await fetch(`${url}/rest/v1/${path}`, {
    method: options.method ?? "GET",
    headers: {
      apikey: anonKey,
      "content-type": "application/json",
      prefer: "return=representation",
      ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const text = await response.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  return { status: response.status, json };
}

const refused = (status: number) => expect([401, 403, 404]).toContain(status);
const rows = (json: unknown) => json as Record<string, unknown>[];

beforeAll(async () => {
  await clearInbox();
  for (const email of [
    "student1@alpha.test",
    "admin@alpha.test",
    "admin@beta.test",
    "pending@alpha.test",
  ]) {
    tokens[email] = await accessTokenFor(email);
  }
}, 120_000);

describe("not signed in (only the anon key)", () => {
  for (const table of [
    "colleges",
    "college_domains",
    "college_settings",
    "profiles",
    "memberships",
    "audit_logs",
    "invite_codes",
    "verification_requests",
    "rate_limit_events",
    "idempotency_keys",
  ]) {
    it(`cannot read ${table}`, async () => {
      refused((await rest(`${table}?select=*`)).status);
    });
  }

  it("can read only the public branding view, with only active colleges and safe columns", async () => {
    const result = await rest("public_college_branding?select=*");
    expect(result.status).toBe(200);
    const data = rows(result.json);
    expect(data.map((r) => r.slug).sort()).toEqual(["alpha", "beta", "global"]);
    expect(Object.keys(data[0]!).sort()).toEqual([
      "accent_hex",
      "allowed_methods",
      "city",
      "modules",
      "name",
      "require_admin_approval",
      "short_name",
      "slug",
      "state",
    ]);
  });

  it("cannot call the internal functions", async () => {
    for (const fn of [
      "redeem_invite",
      "rate_limit_consume",
      "write_audit_log",
      "idem_claim",
      "idem_complete",
      "idem_release",
      "maintenance_run",
      "tf_create_post",
      "tf_decide_request",
      "join_prepare",
      "my_membership_for_slug",
    ]) {
      refused((await rest(`rpc/${fn}`, { method: "POST", body: {} })).status);
    }
  });
});

describe("signed in as an Alpha student", () => {
  const token = () => tokens["student1@alpha.test"]!;

  it("sees only Alpha in colleges, domains and settings", async () => {
    const colleges = await rest("colleges?select=id", { token: token() });
    expect(rows(colleges.json).map((r) => r.id)).toEqual([ALPHA]);
    const settings = await rest("college_settings?select=college_id", { token: token() });
    expect(rows(settings.json).map((r) => r.college_id)).toEqual([ALPHA]);
    const domains = await rest("college_domains?select=domain", { token: token() });
    expect(rows(domains.json).map((r) => r.domain)).toEqual(["alpha.test"]);
  });

  it("sees only their own membership", async () => {
    const result = await rest("memberships?select=user_id,college_id", { token: token() });
    expect(rows(result.json)).toEqual([{ user_id: STUDENT1_ALPHA, college_id: ALPHA }]);
  });

  it("sees active Alpha classmates and nobody from Beta", async () => {
    const result = await rest("profiles?select=user_id,display_name", { token: token() });
    const ids = rows(result.json).map((r) => String(r.user_id));
    expect(ids.length).toBeGreaterThan(1);
    expect(ids.every((id) => id.startsWith("aaaaaaaa"))).toBe(true);
    // The Beta student with the same display name stays hidden.
    expect(rows(result.json).filter((r) => r.display_name === "Riya Sharma")).toHaveLength(1);
  });

  it("cannot read the audit log, invites or requests", async () => {
    expect(rows((await rest("audit_logs?select=id", { token: token() })).json)).toEqual([]);
    expect(rows((await rest("invite_codes?select=id", { token: token() })).json)).toEqual([]);
    expect(rows((await rest("verification_requests?select=id", { token: token() })).json)).toEqual(
      [],
    );
  });

  it("cannot make themselves admin, add a membership or change a college", async () => {
    refused(
      (
        await rest(`memberships?user_id=eq.${STUDENT1_ALPHA}`, {
          token: token(),
          method: "PATCH",
          body: { role: "college_admin" },
        })
      ).status,
    );
    refused(
      (
        await rest("memberships", {
          token: token(),
          method: "POST",
          body: {
            user_id: STUDENT1_ALPHA,
            college_id: BETA,
            status: "active",
            verification_level: 2,
          },
        })
      ).status,
    );
    refused(
      (
        await rest(`colleges?id=eq.${ALPHA}`, {
          token: token(),
          method: "PATCH",
          body: { name: "Hacked" },
        })
      ).status,
    );
    refused(
      (await rest("memberships?id=not.is.null", { token: token(), method: "DELETE" })).status,
    );
  });

  it("cannot change settings of any college (0 rows or refused)", async () => {
    const result = await rest(`college_settings?college_id=eq.${ALPHA}`, {
      token: token(),
      method: "PATCH",
      body: { require_admin_approval: false },
    });
    if (result.status >= 400) refused(result.status);
    else expect(rows(result.json)).toEqual([]);
  });

  it("cannot edit another person's profile, or write the audit log", async () => {
    const other = await rest("profiles?user_id=eq.aaaaaaaa-1000-4000-8000-000000000004", {
      token: token(),
      method: "PATCH",
      body: { headline: "Defaced" },
    });
    if (other.status >= 400) refused(other.status);
    else expect(rows(other.json)).toEqual([]);
    refused(
      (
        await rest("audit_logs", {
          token: token(),
          method: "POST",
          body: { actor_role: "x", action: "forged" },
        })
      ).status,
    );
    refused((await rest("audit_logs?id=not.is.null", { token: token(), method: "DELETE" })).status);
  });

  it("cannot call the server-only functions", async () => {
    for (const fn of [
      "redeem_invite",
      "submit_manual_join",
      "complete_email_domain_join",
      "rate_limit_consume",
      "write_audit_log",
      "join_prepare",
      "idempotency_purge",
    ]) {
      refused((await rest(`rpc/${fn}`, { token: token(), method: "POST", body: {} })).status);
    }
  });

  it("can call my_membership_for_slug and only gets their own row", async () => {
    const own = await rest("rpc/my_membership_for_slug", {
      token: token(),
      method: "POST",
      body: { p_slug: "alpha" },
    });
    expect(own.status).toBe(200);
    expect(rows(own.json)).toHaveLength(1);
    const other = await rest("rpc/my_membership_for_slug", {
      token: token(),
      method: "POST",
      body: { p_slug: "beta" },
    });
    expect(rows(other.json)).toEqual([]);
  });
});

describe("signed in as an admin", () => {
  it("an Alpha admin sees all Alpha memberships and the Alpha audit log, never Beta", async () => {
    const token = tokens["admin@alpha.test"]!;
    const members = await rest("memberships?select=college_id", { token });
    expect(rows(members.json).length).toBeGreaterThanOrEqual(7);
    expect(rows(members.json).every((r) => r.college_id === ALPHA)).toBe(true);
    const audit = await rest("audit_logs?select=college_id", { token });
    expect(rows(audit.json).every((r) => r.college_id === ALPHA)).toBe(true);
  });

  it("an admin can read invites but not the code hash", async () => {
    const token = tokens["admin@alpha.test"]!;
    const ok = await rest("invite_codes?select=id,label", { token });
    expect(ok.status).toBe(200);
    refused((await rest("invite_codes?select=code_hash", { token })).status);
  });

  it("a Beta admin sees only Beta rows", async () => {
    const token = tokens["admin@beta.test"]!;
    const members = await rest("memberships?select=college_id", { token });
    expect(rows(members.json).length).toBeGreaterThanOrEqual(7);
    expect(rows(members.json).every((r) => r.college_id === BETA)).toBe(true);
    const colleges = await rest("colleges?select=id", { token });
    expect(rows(colleges.json).map((r) => r.id)).toEqual([BETA]);
  });

  it("an admin cannot move settings or invites to another college", async () => {
    const token = tokens["admin@alpha.test"]!;
    const moved = await rest(`college_settings?college_id=eq.${ALPHA}`, {
      token,
      method: "PATCH",
      body: { college_id: BETA },
    });
    refused(moved.status);
    const betaSettings = await rest(`college_settings?college_id=eq.${BETA}`, {
      token,
      method: "PATCH",
      body: { require_admin_approval: false },
    });
    if (betaSettings.status >= 400) refused(betaSettings.status);
    else expect(rows(betaSettings.json)).toEqual([]);
  });
});

describe("signed in as a pending member", () => {
  it("sees no college, no classmates, and only their own membership", async () => {
    const token = tokens["pending@alpha.test"]!;
    expect(rows((await rest("colleges?select=id", { token })).json)).toEqual([]);
    const profiles = await rest("profiles?select=user_id", { token });
    expect(rows(profiles.json).map((r) => r.user_id)).toEqual([
      "aaaaaaaa-1000-4000-8000-000000000006",
    ]);
    const memberships = await rest("memberships?select=status", { token });
    expect(rows(memberships.json)).toEqual([{ status: "pending" }]);
  });
});
