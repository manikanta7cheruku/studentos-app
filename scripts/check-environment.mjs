// Checks a running StudentOS environment (local, staging or production) from the outside and from the database side.
// It only reads. The one POST it makes without a secret is refused on purpose to prove the refusal works.
//
//   node scripts/check-environment.mjs --app https://staging.example.com
//   node scripts/check-environment.mjs --app https://app.example.com --production
//
// Settings come from the environment (the same names as .env.example) or from a file given with --env:
//   NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY   needed for the database checks
//   SUPABASE_SERVICE_ROLE_KEY                                 optional: more database checks
//   CRON_SECRET                                               optional: checks the maintenance call answers 200
// --production adds the rules for real data: HTTPS with HSTS, no sample (seed) people, no demo keys.
// Exit code 0 when nothing FAILED, 1 otherwise. WARN means "look at this", FAIL means "do not release".
import { readFileSync } from "node:fs";

const args = process.argv.slice(2);
const option = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const production = args.includes("--production");

const envFile = option("env");
if (envFile) {
  for (const line of readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
  }
}

const app = (option("app") ?? process.env.CHECK_APP_URL ?? "").replace(/\/$/, "");
const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const cronSecret = process.env.CRON_SECRET ?? "";

if (!app) {
  console.error("Give the address of the app: --app https://your-site.example");
  process.exit(2);
}

const results = [];
const record = (status, name, detail = "") => {
  results.push({ status, name, detail });
  const mark = status === "PASS" ? "PASS" : status === "WARN" ? "WARN" : "FAIL";
  console.log(`${mark}  ${name}${detail ? `  (${detail})` : ""}`);
};
const check = async (name, fn) => {
  try {
    const outcome = await fn();
    if (outcome === undefined || outcome === true) record("PASS", name);
    else if (typeof outcome === "string") record("PASS", name, outcome);
    else record(outcome.status, name, outcome.detail);
  } catch (error) {
    record("FAIL", name, error instanceof Error ? error.message : String(error));
  }
};
const fail = (detail) => ({ status: "FAIL", detail });
const warn = (detail) => ({ status: "WARN", detail });

const get = (url, init) => fetch(url, { redirect: "manual", ...init });
const rest = (path, key, init = {}) =>
  get(`${supabaseUrl}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: key, authorization: `Bearer ${key}`, ...(init.headers ?? {}) },
  });

console.log(`\nStudentOS environment check: ${app}${production ? "  [production rules]" : ""}\n`);

// ---------------------------------------------------------------------------------------------
console.log("-- The app");
await check("GET /api/health answers ok", async () => {
  const response = await get(`${app}/api/health`);
  const body = await response.json().catch(() => ({}));
  if (response.status !== 200 || body.status !== "ok") return fail(`status ${response.status}`);
  return body.commit ? `commit ${String(body.commit).slice(0, 7)}` : true;
});

await check("GET /api/ready answers ready (the app reaches its database)", async () => {
  const response = await get(`${app}/api/ready`);
  return response.status === 200 ? true : fail(`status ${response.status}`);
});

await check("security headers on the home page", async () => {
  const response = await get(`${app}/`);
  const h = (name) => response.headers.get(name);
  const missing = [];
  if (!h("content-security-policy")?.includes("frame-ancestors 'none'"))
    missing.push("Content-Security-Policy");
  if (h("x-content-type-options") !== "nosniff") missing.push("X-Content-Type-Options");
  if (h("x-frame-options") !== "DENY") missing.push("X-Frame-Options");
  if (!h("referrer-policy")) missing.push("Referrer-Policy");
  if (h("x-powered-by")) missing.push("X-Powered-By must be absent");
  if (missing.length) return fail(missing.join(", "));
  if (app.startsWith("https://") && !h("strict-transport-security"))
    return fail("Strict-Transport-Security");
  return true;
});

if (production) {
  await check("production uses HTTPS", () =>
    app.startsWith("https://") ? true : fail("the address is not https"),
  );
}

await check("an unknown college is a plain 404", async () => {
  const response = await get(`${app}/api/v1/colleges/public/no-such-college-xyz`);
  return response.status === 404 ? true : fail(`status ${response.status}`);
});

await check("sign in refuses a request from another website (403)", async () => {
  const response = await get(`${app}/api/v1/auth/otp/request`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: "https://evil.example" },
    body: JSON.stringify({ email: "check@example.test" }),
  });
  return response.status === 403 ? true : fail(`status ${response.status}`);
});

await check("the maintenance call refuses a call without the secret (401)", async () => {
  const response = await get(`${app}/api/internal/maintenance`, { method: "POST" });
  return response.status === 401 ? true : fail(`status ${response.status}`);
});

if (cronSecret) {
  await check("the maintenance call works with CRON_SECRET (200)", async () => {
    const response = await get(`${app}/api/internal/maintenance`, {
      method: "POST",
      headers: { authorization: `Bearer ${cronSecret}` },
    });
    const body = await response.json().catch(() => ({}));
    if (response.status !== 200) return fail(`status ${response.status}`);
    return `reminders sent: ${body.data?.reminders_sent ?? "?"}`;
  });
} else {
  record("WARN", "the maintenance call with CRON_SECRET", "CRON_SECRET not given, not checked");
}

// ---------------------------------------------------------------------------------------------
if (!supabaseUrl || !anonKey) {
  record(
    "WARN",
    "database checks",
    "NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY not given, skipped",
  );
} else {
  console.log("\n-- The database, as a visitor who is not signed in (anon key)");
  const privateTables = [
    "colleges",
    "college_settings",
    "memberships",
    "profiles",
    "audit_logs",
    "idempotency_keys",
    "rate_limit_events",
    "notifications",
    "team_posts",
    "join_requests",
    "opportunities",
    "saved_opportunities",
    "reminders",
    "user_prefs",
    "waitlist_leads",
    "reports",
    "blocks",
  ];
  for (const table of privateTables) {
    await check(`anon cannot read ${table}`, async () => {
      const response = await rest(`${table}?select=*&limit=1`, anonKey);
      if (response.status >= 400) return true;
      const rows = await response.json().catch(() => null);
      return Array.isArray(rows) && rows.length === 0 ? true : fail("rows came back");
    });
  }
  await check("anon can read the public college view (and only active colleges)", async () => {
    const response = await rest("public_college_branding?select=slug,modules", anonKey);
    if (response.status !== 200) return fail(`status ${response.status}`);
    const rows = await response.json();
    return `${rows.length} college(s)`;
  });
  for (const fn of [
    "maintenance_run",
    "idem_claim",
    "tf_create_post",
    "mod_create_opportunity",
    "write_audit_log",
  ]) {
    await check(`anon cannot call ${fn}()`, async () => {
      const response = await rest(`rpc/${fn}`, anonKey, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      });
      return response.status >= 400 ? true : fail(`status ${response.status}`);
    });
  }
  await check("sign in settings: email on, no automatic confirmation", async () => {
    const response = await get(`${supabaseUrl}/auth/v1/settings`, { headers: { apikey: anonKey } });
    if (response.status !== 200) return fail(`status ${response.status}`);
    const settings = await response.json();
    if (!settings.external?.email) return fail("the email provider is off");
    if (settings.mailer_autoconfirm) {
      // On a local stack this is normal. In production it lets anyone create an account for an email they do not own.
      return production
        ? fail(
            "mailer_autoconfirm is on: switch on 'Confirm email' in Authentication > Providers > Email",
          )
        : warn("mailer_autoconfirm is on (fine locally, must be off in production)");
    }
    if (settings.external?.phone)
      return warn("phone sign in is on; the app does not use it, switch it off");
    return true;
  });

  if (!serviceKey) {
    record(
      "WARN",
      "database checks with the service key",
      "SUPABASE_SERVICE_ROLE_KEY not given, skipped",
    );
  } else {
    console.log("\n-- The database, with the service key (read only)");
    if (production && serviceKey.includes("service_role") && supabaseUrl.includes("127.0.0.1")) {
      record("FAIL", "production points at a local database", supabaseUrl);
    }
    const expected = [
      "colleges",
      "college_domains",
      "college_settings",
      "profiles",
      "memberships",
      "audit_logs",
      "invite_codes",
      "verification_requests",
      "idempotency_keys",
      "rate_limit_events",
      "skills",
      "user_skills",
      "notifications",
      "announcements",
      "reports",
      "moderation_actions",
      "blocks",
      "waitlist_leads",
      "team_posts",
      "team_post_private",
      "team_post_roles",
      "team_post_role_skills",
      "join_requests",
      "opportunities",
      "saved_opportunities",
      "user_prefs",
      "reminders",
    ];
    await check(`all ${expected.length} tables exist (every migration was pushed)`, async () => {
      const missing = [];
      for (const table of expected) {
        const response = await rest(`${table}?select=*&limit=0`, serviceKey);
        if (response.status >= 300) missing.push(table);
      }
      return missing.length ? fail(`missing: ${missing.join(", ")}`) : true;
    });
    await check("the avatars bucket exists with the image types and the 2 MB limit", async () => {
      const response = await get(`${supabaseUrl}/storage/v1/bucket/avatars`, {
        headers: { apikey: serviceKey, authorization: `Bearer ${serviceKey}` },
      });
      if (response.status !== 200)
        return fail(`status ${response.status}: push migration 20261110000000`);
      const bucket = await response.json();
      if (bucket.file_size_limit !== 2097152)
        return fail(`size limit is ${bucket.file_size_limit}`);
      if (
        !Array.isArray(bucket.allowed_mime_types) ||
        bucket.allowed_mime_types.some((t) => !t.startsWith("image/") || t.includes("svg"))
      ) {
        return fail("allowed types are wrong");
      }
      return true;
    });
    await check("at least one active college exists", async () => {
      const response = await rest("colleges?select=slug&status=eq.active", serviceKey);
      const rows = await response.json();
      return rows.length >= 1
        ? `${rows.length}: ${rows.map((r) => r.slug).join(", ")}`
        : warn("none yet: run supabase/production/create-college.sql");
    });
    await check("every active college has an active admin", async () => {
      const colleges = await (
        await rest("colleges?select=id,slug&status=eq.active", serviceKey)
      ).json();
      const lonely = [];
      for (const college of colleges) {
        const admins = await (
          await rest(
            `memberships?select=id&college_id=eq.${college.id}&role=eq.college_admin&status=eq.active`,
            serviceKey,
          )
        ).json();
        if (admins.length === 0) lonely.push(college.slug);
      }
      return lonely.length ? fail(`no active admin: ${lonely.join(", ")}`) : true;
    });
    if (production) {
      await check("no sample (seed) people or colleges in production", async () => {
        const users = await (
          await get(`${supabaseUrl}/auth/v1/admin/users?per_page=1000`, {
            headers: { apikey: serviceKey, authorization: `Bearer ${serviceKey}` },
          })
        ).json();
        const seed = (users.users ?? []).filter((u) => /@(alpha|beta)\.test$/.test(u.email ?? ""));
        const colleges = await (
          await rest("colleges?select=slug&slug=in.(alpha,beta)", serviceKey)
        ).json();
        if (seed.length || colleges.length)
          return fail(
            `${seed.length} sample people, ${colleges.length} sample colleges: do not load supabase/seed.sql in production`,
          );
        return true;
      });
    }
  }
}

// ---------------------------------------------------------------------------------------------
const failed = results.filter((r) => r.status === "FAIL").length;
const warned = results.filter((r) => r.status === "WARN").length;
console.log(
  `\n${results.length} checks: ${results.length - failed - warned} passed, ${warned} to look at, ${failed} failed.`,
);
console.log(failed ? "NOT READY." : warned ? "Ready, but look at the WARN lines." : "READY.");
process.exit(failed ? 1 : 0);
