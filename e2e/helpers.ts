import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import type { APIRequestContext, Playwright } from "@playwright/test";
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
  playwright: Playwright,
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

export async function cleanUp(): Promise<void> {
  const db = admin();
  await db.from("invite_codes").delete().like("label", "e2e %");
  const { data } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
  for (const user of data?.users ?? []) {
    if (user.email?.startsWith("e2e-") && user.email.endsWith("@example.test"))
      await db.auth.admin.deleteUser(user.id);
  }
}
