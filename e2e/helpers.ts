import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import type { APIRequestContext, PlaywrightWorkerArgs } from "@playwright/test";
import { hashInviteCode } from "@/modules/tenancy/join.admin";

// Helpers for the journey tests. They need the local stack and .env.local (see playwright.config.ts).
// The service role key is used only here, to prepare data and to read the sign in code. Local only.

const env = (name: string): string => {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is missing. Run pnpm env:local after pnpm db:start.`);
  return value;
};

export function admin() {
  const url = env("NEXT_PUBLIC_SUPABASE_URL");
  const host = new URL(url).hostname;
  // These helpers delete users and write invites. They refuse to touch anything that is not the local stack,
  // unless the test job says it is staging with fake data.
  if (!["127.0.0.1", "localhost"].includes(host) && process.env.E2E_ALLOW_REMOTE !== "staging") {
    throw new Error(
      "The journey helpers only run against the local stack (or staging with E2E_ALLOW_REMOTE=staging).",
    );
  }
  return createClient(url, env("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });
}

export const uniqueEmail = (prefix = "e2e") => `${prefix}-${randomUUID().slice(0, 8)}@example.test`;
export const uniqueIp = () =>
  `10.${1 + Math.floor(Math.random() * 250)}.${1 + Math.floor(Math.random() * 250)}.${1 + Math.floor(Math.random() * 250)}`;

// The 6 digit code for an address. Local: read the mail from Mailpit. Otherwise: ask Supabase for a code
// without sending mail (needs the service role key; used on staging).
export async function codeFor(email: string): Promise<string> {
  const mailpit = process.env.MAILPIT_URL;
  if (mailpit) {
    for (let attempt = 0; attempt < 40; attempt++) {
      const list = (await (
        await fetch(`${mailpit}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`)
      ).json()) as {
        messages?: { ID: string; Created: string }[];
      };
      const newest = [...(list.messages ?? [])].sort((a, b) =>
        b.Created.localeCompare(a.Created),
      )[0];
      if (newest) {
        const detail = (await (await fetch(`${mailpit}/api/v1/message/${newest.ID}`)).json()) as {
          Text: string;
        };
        const match = /\b(\d{6})\b/.exec(detail.Text);
        if (match?.[1]) return match[1];
      }
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
    throw new Error(`No mail arrived for ${email}.`);
  }
  const { data, error } = await admin().auth.admin.generateLink({ type: "magiclink", email });
  if (error || !data.properties?.email_otp) throw error ?? new Error("No code was returned.");
  return data.properties.email_otp;
}

// A signed-in API client. Its cookie jar keeps the session cookies, like a browser does.
export async function signedInClient(
  playwright: PlaywrightWorkerArgs["playwright"],
  baseURL: string,
  email: string,
): Promise<{ api: APIRequestContext; userId: string }> {
  const api = await playwright.request.newContext({
    baseURL,
    extraHTTPHeaders: { origin: new URL(baseURL).origin, "x-forwarded-for": uniqueIp() },
  });
  const requested = await api.post("/api/v1/auth/otp/request", { data: { email } });
  if (requested.status() !== 200)
    throw new Error(`Code request failed: ${requested.status()} ${await requested.text()}`);
  const code = await codeFor(email);
  const verified = await api.post("/api/v1/auth/otp/verify", { data: { email, code } });
  if (verified.status() !== 200)
    throw new Error(`Sign in failed: ${verified.status()} ${await verified.text()}`);
  const body = (await verified.json()) as { data: { user: { id: string } } };
  return { api, userId: body.data.user.id };
}

export async function createInvite(
  label: string,
  options: {
    maxUses?: number;
    expiresInMs?: number;
    grants?: "active" | "pending";
    usedCount?: number;
  } = {},
): Promise<string> {
  const db = admin();
  const { data: college, error: collegeError } = await db
    .from("colleges")
    .select("id")
    .eq("slug", "alpha")
    .single();
  if (collegeError) throw collegeError;
  const code = `E2E${randomUUID().slice(0, 6).toUpperCase()}-${label}`.toUpperCase();
  const { error } = await db.from("invite_codes").insert({
    college_id: college.id,
    code_hash: hashInviteCode(code),
    label: `e2e ${label}`,
    max_uses: options.maxUses ?? 5,
    used_count: options.usedCount ?? 0,
    expires_at: new Date(Date.now() + (options.expiresInMs ?? 24 * 3600 * 1000)).toISOString(),
    grants_status: options.grants ?? "active",
  });
  if (error) throw error;
  return code;
}

// A published opportunity of Alpha College, posted by the seeded Alpha admin. Removed again by cleanUp.
export async function createOpportunity(label: string): Promise<{ id: string; title: string }> {
  const db = admin();
  const { data: college, error: collegeError } = await db
    .from("colleges")
    .select("id")
    .eq("slug", "alpha")
    .single();
  if (collegeError) throw collegeError;
  const title = `E2E ${label} internship`;
  const { data, error } = await db
    .from("opportunities")
    .insert({
      college_id: college.id,
      title,
      org: `E2E Org ${label}`,
      kind: "internship",
      location: "Hyderabad",
      mode: "hybrid",
      stipend_min: 1500000,
      stipend_max: 2000000,
      eligibility: "Third year students of any branch.",
      skills: ["React", "SQL"],
      deadline: new Date(Date.now() + 20 * 24 * 3600 * 1000).toISOString(),
      apply_url: "https://careers.example.test/apply",
      posted_by: "aaaaaaaa-1000-4000-8000-000000000001",
      status: "published",
    })
    .select("id")
    .single();
  if (error) throw error;
  return { id: data.id, title };
}

export async function cleanUp(): Promise<void> {
  const db = admin();
  await db.from("opportunities").delete().like("title", "E2E %");
  await db.from("announcements").delete().like("title", "E2E %");
  await db.from("invite_codes").delete().like("label", "e2e %");
  const { data } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
  for (const user of data?.users ?? []) {
    if (user.email?.startsWith("e2e-") && user.email.endsWith("@example.test"))
      await db.auth.admin.deleteUser(user.id);
  }
}

// Sign in through the real sign in page (email, then the code from the mail). Ends on the page `next` or the person's home.
export async function signInThroughUi(
  page: import("@playwright/test").Page,
  email: string,
  next?: string,
): Promise<void> {
  await page.goto(next ? `/signin?next=${encodeURIComponent(next)}` : "/signin");
  await page.getByLabel(/email address/i).fill(email);
  await page.getByRole("button", { name: /email me a code/i }).click();
  await page.getByRole("heading", { name: /enter the code/i }).waitFor();
  await page.getByLabel(/six digit code from your email/i).fill(await codeFor(email));
}

// A new student who has joined Alpha College with a fresh invite code, through the real screens. Returns the email.
export async function memberOfAlpha(
  page: import("@playwright/test").Page,
  label: string,
): Promise<string> {
  const email = uniqueEmail();
  const invite = await createInvite(label);
  await signInThroughUi(page, email, "/c/alpha/join");
  await page
    .getByLabel(/invite code/i)
    .last()
    .fill(invite);
  await page.getByRole("button", { name: /join with this code/i }).click();
  await page.waitForURL(/\/c\/alpha\/home$/);
  return email;
}

// The same person is in Global (open to every student). A member of a college is added to Global by the app on the first
// visit, so the join page may already send them on to Global; if not, they join with the button.
export async function joinGlobalThroughUi(page: import("@playwright/test").Page): Promise<void> {
  await page.goto("/c/global/join");
  const join = page.getByRole("button", { name: /join global/i });
  // isVisible() does not wait, so wait for either the button or the redirect to Global.
  const shown = await join
    .waitFor({ state: "visible", timeout: 8000 })
    .then(() => true)
    .catch(() => false);
  if (shown) await join.click().catch(() => undefined);
  await page.waitForURL(/\/c\/global\/home$/);
}

// Gives an existing Alpha member a different role (admin or moderator), as the owner would in the database.
export async function setAlphaRole(
  email: string,
  role: "student" | "moderator" | "college_admin",
): Promise<void> {
  const db = admin();
  const { data } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const user = data?.users.find((u) => u.email === email);
  if (!user) throw new Error(`No user ${email}`);
  const { data: college } = await db.from("colleges").select("id").eq("slug", "alpha").single();
  const { error } = await db
    .from("memberships")
    .update({ role })
    .eq("user_id", user.id)
    .eq("college_id", college!.id);
  if (error) throw error;
}
