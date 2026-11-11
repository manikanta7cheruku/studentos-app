import { expect, test, type Page } from "@playwright/test";
import { cleanUp, createInvite, signInThroughUi, uniqueEmail, uniqueIp } from "./helpers";

// Browser journeys for R3 Day 1 (the app shell), desktop and phone, against the real backend: the college gate, the
// navigation, the real Campus and Notifications screens, the honest "coming soon" tabs, and the error pages.

test.describe.configure({ mode: "serial" });

test.beforeEach(async ({ context }) => {
  await context.setExtraHTTPHeaders({ "x-forwarded-for": uniqueIp() });
});

test.afterAll(async () => {
  await cleanUp();
});

async function expectNoSidewaysScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

async function member(page: Page, label: string) {
  const invite = await createInvite(label);
  await signInThroughUi(page, uniqueEmail(), "/c/alpha/join");
  await page
    .getByLabel(/invite code/i)
    .last()
    .fill(invite);
  await page.getByRole("button", { name: /join with this code/i }).click();
  await expect(page).toHaveURL(/\/c\/alpha\/home$/);
}

test("a member sees the campus inside the college shell", async ({ page }) => {
  await member(page, "SHL1");
  await expect(
    page.getByRole("heading", { name: /good (morning|afternoon|evening)|up late/i, level: 1 }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /^skip to content/i })).toBeAttached();
  await expectNoSidewaysScroll(page);
});

test("the tabs open their screens", async ({ page, isMobile }) => {
  await member(page, "SHL2");
  const nav = page.getByRole("navigation").filter({ visible: true });
  await nav.getByRole("link", { name: /plans/i }).first().click();
  await expect(page).toHaveURL(/\/c\/alpha\/collaborate$/);
  await expect(page.getByRole("heading", { level: 1 }).filter({ visible: true })).toBeVisible();
  await expectNoSidewaysScroll(page);

  await page.goto("/c/alpha/career");
  await expect(page.getByRole("heading", { level: 1 }).filter({ visible: true })).toBeVisible();

  await page.goto("/c/alpha/notifications");
  await expect(
    page.getByRole("heading", { name: /updates/i, level: 1 }).filter({ visible: true }),
  ).toBeVisible();
  await expectNoSidewaysScroll(page);
  void isMobile;
});

test("signing out ends the session", async ({ page, isMobile }) => {
  await member(page, "SHL3");
  if (isMobile) {
    // On a phone, sign out is in Settings (Me tab, then Settings).
    await page.goto("/c/alpha/me/settings");
    await page.getByRole("button", { name: /^sign out/i }).click();
  } else {
    await page
      .getByRole("button", { name: /account menu/i })
      .filter({ visible: true })
      .first()
      .click();
    await page.getByRole("menuitem", { name: /sign out/i }).click();
  }
  await expect(page).toHaveURL(/localhost:\d+\/$/);
  await page.goto("/c/alpha/campus");
  await expect(page).toHaveURL(/\/signin/);
});

test("an address that does not exist shows the not found page", async ({ page }) => {
  await page.goto("/this-page-does-not-exist");
  await expect(page.getByRole("heading", { name: /could not find that page/i })).toBeVisible();
  await expectNoSidewaysScroll(page);
});
