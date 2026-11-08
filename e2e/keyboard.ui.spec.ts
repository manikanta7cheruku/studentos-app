import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  expect,
  test,
  type BrowserContext,
  type Page,
  type PlaywrightWorkerArgs,
} from "@playwright/test";
import { codeFor, signedInClient } from "./helpers";
import { dialogKeyboardRoundTrip, printReport, tabThrough } from "./keyboard";

// R4-D8-1 step 2: keyboard only checks for sign in, Team Finder and the tracker.
// Needs: pnpm db:start, pnpm db:reset, .env.local (pnpm env:local). Local stack only.
// EDIT THESE if your routes or button names differ:
const SIGN_IN = "/signin";
const TEAM_FINDER = "/c/alpha/collaborate";
const TRACKER = "/c/alpha/career/tracker";
// The Team Finder parts (filter bar, request dialog) are shown on the dev components page until R3 uses them.
const PARTS = "/dev/components";
const REQUEST_BUTTON = "Open normal request dialog";
const EMAIL = "student1@alpha.test";
// The typed sign in test asks for a fresh code, so it uses its own user and cannot hit the limit of the cached one.
const SIGN_IN_EMAIL = "student2@alpha.test";

async function signIn(
  context: BrowserContext,
  playwright: PlaywrightWorkerArgs["playwright"],
  baseURL: string,
  email: string,
) {
  const dir = join(tmpdir(), "studentos-e2e-auth");
  const file = join(dir, `kb-${email}.json`);
  const fresh = existsSync(file) && Date.now() - statSync(file).mtimeMs < 30 * 60 * 1000;
  if (!fresh) {
    const { api } = await signedInClient(playwright, baseURL, email);
    mkdirSync(dir, { recursive: true });
    writeFileSync(file, JSON.stringify((await api.storageState()).cookies));
  }
  await context.addCookies(JSON.parse(readFileSync(file, "utf8")));
}

async function openSignedIn(page: Page, route: string) {
  const response = await page.goto(route);
  test.skip(response?.status() === 404, `${route} is a 404 on this branch, not tested`);
  expect(new URL(page.url()).pathname, "was sent to sign in: cookies may be old").not.toBe(SIGN_IN);
  const h1 = page.getByRole("heading", { level: 1 }).first();
  await expect(h1).toBeVisible();
  await expect(h1).not.toHaveText(/one moment/i);
}

test("sign in page: tab order, focus ring, no trap", async ({ page }, info) => {
  await page.goto(SIGN_IN);
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
  const report = await tabThrough(page);
  await printReport("sign-in", report, info);
  expect(report.unreachable).toEqual([]);
  expect(report.noRing).toEqual([]);
  expect(report.trapped).toBe(false);
});

test("sign in works with the keyboard only", async ({ page }) => {
  // Empty the local mailbox so the code we read is the one this test caused.
  if (process.env.MAILPIT_URL)
    await fetch(`${process.env.MAILPIT_URL}/api/v1/messages`, { method: "DELETE" });

  await page.goto(SIGN_IN);
  for (let i = 0; i < 10; i++) {
    await page.keyboard.press("Tab");
    if (await page.evaluate(() => document.activeElement?.tagName === "INPUT")) break;
  }
  await page.keyboard.type(SIGN_IN_EMAIL);
  await page.keyboard.press("Enter");

  const code = await codeFor(SIGN_IN_EMAIL);
  await expect
    .poll(() => page.evaluate(() => document.activeElement?.tagName), {
      message: "focus should move to the code field",
    })
    .toBe("INPUT");
  await page.keyboard.type(code);
  await page.keyboard.press("Enter");
  await page.waitForURL((url) => !url.pathname.startsWith(SIGN_IN), { timeout: 15_000 });
});

test("Team Finder screen (placeholder on main): tab order, focus ring, no trap", async ({
  page,
  context,
  playwright,
  baseURL,
}, info) => {
  await signIn(context, playwright, baseURL!, EMAIL);
  await openSignedIn(page, TEAM_FINDER);
  const report = await tabThrough(page);
  await printReport("team-finder", report, info);
  expect(report.unreachable).toEqual([]);
  expect(report.noRing).toEqual([]);
  expect(report.trapped).toBe(false);
});

test("Team Finder parts: phone filter sheet opens and closes by keyboard", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "phone", "the Filters button only shows on phone size");
  await page.goto(PARTS);
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
  await dialogKeyboardRoundTrip(page, page.getByRole("button", { name: /open filters/i }).first());
});

test("Team Finder parts: request dialog opens and closes by keyboard", async ({ page }) => {
  await page.goto(PARTS);
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
  await dialogKeyboardRoundTrip(page, page.getByRole("button", { name: REQUEST_BUTTON }));
});

test("tracker: tab order, focus ring, no trap", async ({
  page,
  context,
  playwright,
  baseURL,
}, info) => {
  await signIn(context, playwright, baseURL!, EMAIL);
  await openSignedIn(page, TRACKER);
  const report = await tabThrough(page);
  await printReport("tracker", report, info);
  expect(report.unreachable).toEqual([]);
  expect(report.noRing).toEqual([]);
  expect(report.trapped).toBe(false);
});
