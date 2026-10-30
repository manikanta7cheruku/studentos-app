import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import type { ZodType } from "zod";
import { adminClient } from "@/server/admin/supabase-admin";

export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export type Handler = (request: Request, context?: { params: Promise<never> }) => Promise<Response>;

export type Result = {
  status: number;
  body: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  headers: Headers;
  response: Response;
};

type CallOptions = {
  method?: string;
  path: string;
  json?: unknown;
  rawBody?: string;
  headers?: Record<string, string>;
  cookie?: string;
  bearer?: string;
  ip?: string;
  params?: Record<string, string>;
};

// Call a route handler directly, like Next.js would.
export async function call(handler: unknown, options: CallOptions): Promise<Result> {
  const headers = new Headers(options.headers);
  if (
    (options.json !== undefined || options.rawBody !== undefined) &&
    !headers.has("content-type")
  ) {
    headers.set("content-type", "application/json");
  }
  if (options.cookie) headers.set("cookie", options.cookie);
  if (options.bearer) headers.set("authorization", `Bearer ${options.bearer}`);
  headers.set("x-forwarded-for", options.ip ?? randomIp());
  if ((options.method ?? "GET") !== "GET" && !headers.has("origin")) headers.set("origin", APP_URL);
  const request = new Request(`${APP_URL}${options.path}`, {
    method: options.method ?? "GET",
    headers,
    body:
      options.rawBody ?? (options.json !== undefined ? JSON.stringify(options.json) : undefined),
  });
  const run = handler as (
    r: Request,
    c?: { params: Promise<Record<string, string>> },
  ) => Promise<Response>;
  const response = await run(request, { params: Promise.resolve(options.params ?? {}) });
  const text = await response.text();
  return {
    status: response.status,
    body: text ? JSON.parse(text) : null,
    headers: response.headers,
    response,
  };
}

export function randomIp(): string {
  const n = () => Math.floor(Math.random() * 250) + 1;
  return `10.${n()}.${n()}.${n()}`;
}

export function randomEmail(prefix = "it"): string {
  return `${prefix}-${randomUUID().slice(0, 8)}@example.test`;
}

export function expectMatches(schema: ZodType, value: unknown): void {
  const result = schema.safeParse(value);
  if (!result.success)
    throw new Error(`Does not match the contract: ${JSON.stringify(result.error.issues)}`);
}

// Latest 6 digit code that Supabase Auth mailed to this address (local Mailpit inbox).
export async function latestCode(email: string): Promise<string> {
  const base = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";
  for (let attempt = 0; attempt < 40; attempt++) {
    const search = await fetch(`${base}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`);
    const list = (await search.json()) as { messages?: { ID: string; Created: string }[] };
    const newest = [...(list.messages ?? [])].sort((a, b) => b.Created.localeCompare(a.Created))[0];
    if (newest) {
      const detail = (await (await fetch(`${base}/api/v1/message/${newest.ID}`)).json()) as {
        Text: string;
      };
      const match = /\b(\d{6})\b/.exec(detail.Text);
      if (match?.[1]) return match[1];
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`No code arrived for ${email}. Is the local stack running (pnpm db:start)?`);
}

export async function clearInbox(): Promise<void> {
  const base = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";
  await fetch(`${base}/api/v1/messages`, { method: "DELETE" });
}

// Turn Set-Cookie headers into one Cookie header for the next request.
export function cookieHeader(headers: Headers): string {
  return headers
    .getSetCookie()
    .map((line) => line.split(";")[0] ?? "")
    .filter((pair) => !pair.endsWith("="))
    .join("; ");
}

export async function clearRateLimits(): Promise<void> {
  const { error } = await adminClient().from("rate_limit_events").delete().gt("id", 0);
  if (error) throw error;
}

// Sign in through the real endpoints and return the session cookie and the access token.
const lastRequestAt = new Map<string, number>();

// The mail service allows one code per address per second (local setting). Wait if needed.
export async function waitForMailCooldown(email: string): Promise<void> {
  const wait = (lastRequestAt.get(email) ?? 0) + 1200 - Date.now();
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
  lastRequestAt.set(email, Date.now());
}

export async function signIn(
  routes: { request: unknown; verify: unknown },
  email: string,
): Promise<{ cookie: string; userId: string; isNew: boolean }> {
  const ip = randomIp();
  // Test files run one after the other, each with its own memory. The mail service may still be in its
  // one second pause for this address from an earlier file, so a 429 is retried a few times.
  let requested: Result | undefined;
  for (let attempt = 0; attempt < 6; attempt++) {
    await waitForMailCooldown(email);
    requested = await call(routes.request, {
      method: "POST",
      path: "/api/v1/auth/otp/request",
      json: { email },
      ip,
    });
    if (requested.status !== 429) break;
    await new Promise((resolve) => setTimeout(resolve, 1200));
  }
  if (!requested) throw new Error("OTP request was not sent");
  if (requested.status !== 200)
    throw new Error(`OTP request failed: ${requested.status} ${JSON.stringify(requested.body)}`);
  const code = await latestCode(email);
  const verified = await call(routes.verify, {
    method: "POST",
    path: "/api/v1/auth/otp/verify",
    json: { email, code },
    ip,
  });
  if (verified.status !== 200)
    throw new Error(`OTP verify failed: ${verified.status} ${JSON.stringify(verified.body)}`);
  return {
    cookie: cookieHeader(verified.headers),
    userId: verified.body.data.user.id,
    isNew: verified.body.data.is_new,
  };
}

// A real access token, for the Authorization: Bearer path.
export async function accessTokenFor(email: string): Promise<string> {
  await waitForMailCooldown(email);
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { persistSession: false },
    },
  );
  let sent = await client.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
  for (
    let attempt = 0;
    attempt < 6 && sent.error?.code === "over_email_send_rate_limit";
    attempt++
  ) {
    await new Promise((resolve) => setTimeout(resolve, 1200));
    sent = await client.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
  }
  if (sent.error) throw sent.error;
  const code = await latestCode(email);
  const verified = await client.auth.verifyOtp({ email, token: code, type: "email" });
  if (verified.error || !verified.data.session) throw verified.error ?? new Error("no session");
  return verified.data.session.access_token;
}

export async function deleteTestUsers(emailSuffix = "@example.test"): Promise<void> {
  const admin = adminClient();
  const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  for (const user of data?.users ?? []) {
    if (user.email?.endsWith(emailSuffix)) await admin.auth.admin.deleteUser(user.id);
  }
}
