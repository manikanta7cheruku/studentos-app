import { randomUUID } from "node:crypto";
import { expect, test, type APIRequestContext } from "@playwright/test";
import { cleanUp, createInvite, signedInClient, uniqueEmail } from "./helpers";

// Checkpoint 1 journey, through the real HTTP endpoints of the running app:
// sign in with an email code, join with an invite code (good, used up, expired, wrong), sign out.
// The screens do not exist yet (R3, Day 2), so these tests use the API like the screens will.

test.describe.configure({ mode: "serial" });

const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${process.env.E2E_PORT ?? 3000}`;

const joinWith = (api: APIRequestContext, code: string, key: string = randomUUID()) =>
  api.post("/api/v1/c/alpha/join/invite", { data: { code }, headers: { "idempotency-key": key } });

const membership = async (api: APIRequestContext) =>
  (
    (await (await api.get("/api/v1/c/alpha/me/membership")).json()) as {
      data: { membership: Record<string, unknown> | null };
    }
  ).data.membership;

test.afterAll(async () => {
  await cleanUp();
});

test("the college page is public and shows the join methods", async ({ request }) => {
  const response = await request.get("/api/v1/colleges/public/alpha");
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.data).toMatchObject({ slug: "alpha", name: "Alpha College" });
  expect(body.data.allowed_methods).toContain("invite_code");
});

test("sign in with an email code, then join with a good invite code", async ({ playwright }) => {
  const email = uniqueEmail();
  const { api } = await signedInClient(playwright, baseURL, email);

  // Signed in, not a member yet.
  expect(await membership(api)).toBeNull();

  const code = await createInvite("GOOD");
  const key = randomUUID();
  const joined = await joinWith(api, code, key);
  expect(joined.status()).toBe(200);
  expect((await joined.json()).data.membership).toMatchObject({
    status: "active",
    verification_level: 2,
    verification_method: "invite_code",
  });
  expect(await membership(api)).toMatchObject({ role: "student", status: "active" });

  // A double click or a retry with the same key gets the first answer back.
  const replay = await joinWith(api, code, key);
  expect(replay.status()).toBe(200);
  expect(replay.headers()["idempotent-replay"]).toBe("true");

  // Signing out ends the session.
  expect((await api.post("/api/v1/auth/logout")).status()).toBe(200);
  expect((await api.get("/api/v1/c/alpha/me/membership")).status()).toBe(401);
  await api.dispose();
});

test("an invite code that is used up, expired or wrong gives the right error", async ({
  playwright,
}) => {
  const { api } = await signedInClient(playwright, baseURL, uniqueEmail());

  const usedUp = await createInvite("FULL", { maxUses: 1, usedCount: 1 });
  const expired = await createInvite("OLD", { expiresInMs: -60_000 });

  const full = await joinWith(api, usedUp);
  expect(full.status()).toBe(409);
  expect((await full.json()).error.code).toBe("INVITE_EXHAUSTED");

  const old = await joinWith(api, expired);
  expect(old.status()).toBe(410);
  expect((await old.json()).error.code).toBe("INVITE_EXPIRED");

  const wrong = await joinWith(api, "E2E-NO-SUCH-CODE");
  expect(wrong.status()).toBe(400);
  expect((await wrong.json()).error.code).toBe("INVITE_INVALID");

  // A failed attempt does not make anyone a member.
  expect(await membership(api)).toBeNull();
  await api.dispose();
});

test("two people share the last invite use: one gets in, one is told it is used up", async ({
  playwright,
}) => {
  const code = await createInvite("LAST", { maxUses: 1 });
  const first = await signedInClient(playwright, baseURL, uniqueEmail());
  const second = await signedInClient(playwright, baseURL, uniqueEmail());
  const [a, b] = await Promise.all([joinWith(first.api, code), joinWith(second.api, code)]);
  expect([a.status(), b.status()].sort()).toEqual([200, 409]);
  await first.api.dispose();
  await second.api.dispose();
});

test("someone who is not signed in cannot join", async ({ request }) => {
  const response = await request.post("/api/v1/c/alpha/join/invite", {
    data: { code: "ANY" },
    headers: { "idempotency-key": randomUUID() },
  });
  expect(response.status()).toBe(401);
  expect((await response.json()).error.code).toBe("UNAUTHENTICATED");
});
