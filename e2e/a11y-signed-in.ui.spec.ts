import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test, type BrowserContext, type PlaywrightWorkerArgs } from "@playwright/test";
import { blockingProblems, runAxe } from "./axe";
import { signedInClient } from "./helpers";

// Runs axe on the signed-in pages with the fake users from supabase/seed.sql (local stack only).
// Needs: pnpm db:start, pnpm db:reset, .env.local (pnpm env:local). See playwright.config.ts.

test.use({ bypassCSP: true });

type Role = "student" | "admin" | "pending";
type Cookies = Parameters<BrowserContext["addCookies"]>[0];

const emails: Record<Role, string> = {
  student: "student1@alpha.test",
  admin: "admin@alpha.test",
  pending: "pending@alpha.test",
};

const pages: { role: Role; path: string }[] = [
  { role: "student", path: "/me" },
  { role: "student", path: "/me/edit" },
  { role: "student", path: "/me/notifications" },
  { role: "student", path: "/me/skills" },
  { role: "student", path: "/campus/announcements" },
  { role: "student", path: "/c/alpha" },
  { role: "student", path: "/c/alpha/campus" },
  { role: "student", path: "/c/alpha/collaborate" },
  { role: "student", path: "/c/alpha/career" },
  { role: "student", path: "/c/alpha/people" },
  { role: "student", path: "/c/alpha/people/aaaaaaaa-1000-4000-8000-000000000004" },
  { role: "student", path: "/c/alpha/me" },
  { role: "student", path: "/c/alpha/me/edit" },
  { role: "student", path: "/c/alpha/me/settings" },
  { role: "student", path: "/c/alpha/me/skills" },
  { role: "student", path: "/c/alpha/notifications" },
  { role: "admin", path: "/admin/reports" },
  { role: "admin", path: "/c/alpha/admin" },
  { role: "admin", path: "/c/alpha/admin/members" },
  { role: "admin", path: "/c/alpha/admin/invites" },
  { role: "admin", path: "/c/alpha/admin/verification" },
  { role: "admin", path: "/c/alpha/admin/audit" },
  { role: "admin", path: "/c/alpha/admin/settings" },
  { role: "pending", path: "/c/alpha/pending" },
];

const AUTH_CACHE_DIR = join(tmpdir(), "studentos-e2e-auth");
const SESSION_TTL_MS = 30 * 60 * 1000;

async function getSessionCookies(
  playwright: PlaywrightWorkerArgs["playwright"],
  baseURL: string,
  role: Role,
): Promise<Cookies> {
  const cacheFile = join(AUTH_CACHE_DIR, `${role}.json`);
  if (existsSync(cacheFile)) {
    try {
      const stat = statSync(cacheFile);
      if (Date.now() - stat.mtimeMs < SESSION_TTL_MS) {
        return JSON.parse(readFileSync(cacheFile, "utf8")) as Cookies;
      }
    } catch {
      // Ignore cache read error and re-authenticate
    }
  }

  const { api } = await signedInClient(playwright, baseURL, emails[role]);
  const cookies = (await api.storageState()).cookies;
  await api.dispose();

  mkdirSync(AUTH_CACHE_DIR, { recursive: true });
  writeFileSync(cacheFile, JSON.stringify(cookies, null, 2), "utf8");
  return cookies;
}

for (const { role, path } of pages) {
  test(`axe (${role}): ${path} has no serious or critical problems`, async ({
    page,
    context,
    playwright,
    baseURL,
  }, testInfo) => {
    if (!baseURL) throw new Error("baseURL is missing");

    const cookies = await getSessionCookies(playwright, baseURL, role);
    await context.addCookies(cookies);

    await page.goto(path);
    await expect(page.locator("h1").first()).toBeVisible({ timeout: 20_000 });
    await expect(page.locator("h1").first()).not.toHaveText(/one moment/i, { timeout: 20_000 });
    const landedOn = new URL(page.url()).pathname;
    expect(landedOn, `${role} was sent to ${landedOn} instead of ${path}`).not.toBe("/signin");

    const problems = await runAxe(page);
    await testInfo.attach(`axe-${role}-${path.replace(/\W+/g, "_")}.json`, {
      body: JSON.stringify(problems, null, 2),
      contentType: "application/json",
    });
    for (const p of problems) {
      console.log(
        `[${role} ${path} -> ${landedOn}] ${p.impact} | ${p.id} | ${p.help} | ${p.nodes.length} element(s)`,
      );
    }

    const blocking = blockingProblems(problems);
    expect(
      blocking,
      blocking.map((p) => `${p.impact} ${p.id}: ${p.nodes.join("\n")}`).join("\n"),
    ).toEqual([]);
  });
}
