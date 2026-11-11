import { expect, test, type Page } from "@playwright/test";
import { cleanUp, joinGlobalThroughUi, memberOfAlpha, uniqueIp } from "./helpers";

// Browser journeys for R3 Day 5 (Team Finder screens), desktop and phone, against the real backend:
// post with roles, find it, filter, edit, close, and post to Global instead of the college.

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

async function fillPost(page: Page, title: string) {
  await page.getByLabel(/^title/i).fill(title);
  await page
    .getByLabel(/what are you building/i)
    .fill("A bus tracker for the campus, built in a weekend.");
  await page.getByPlaceholder("Frontend developer").first().fill("Frontend developer");
  await page
    .getByLabel(/^places/i)
    .first()
    .fill("2");
}

test("the empty team finder invites the first post", async ({ page }) => {
  await memberOfAlpha(page, "TF0");
  await page.goto("/c/alpha/collaborate");
  await expect(page.getByRole("heading", { name: /^plans$/i, level: 1 })).toBeVisible();
  await expect(page.getByText(/no plans yet/i)).toBeVisible();
  await expectNoSidewaysScroll(page);
});

test("a short title is explained before sending", async ({ page }) => {
  await memberOfAlpha(page, "TF1");
  await page.goto("/c/alpha/collaborate/new");
  await page.getByLabel(/^title/i).fill("Hi");
  await page.getByRole("button", { name: /^post plan$/i }).click();
  await expect(page.getByText(/at least 5 characters/i)).toBeVisible();
  await expect(page.getByText(/name the role/i)).toBeVisible();
  await expectNoSidewaysScroll(page);
});

test("post with roles, find it, filter, edit, then close", async ({ page }) => {
  await memberOfAlpha(page, "TF2");
  await page.goto("/c/alpha/collaborate/new");
  await expectNoSidewaysScroll(page);
  await fillPost(page, "Campus bus tracker for the hackathon");
  await page.getByLabel(/skills for role 1/i).fill("Pyth");
  await page.getByRole("button", { name: /python/i }).click();
  await page.getByRole("button", { name: /add another role/i }).click();
  await page.getByPlaceholder("Frontend developer").nth(1).fill("Designer");
  await page.getByRole("button", { name: /^post plan$/i }).click();

  // The post page
  await expect(page).toHaveURL(/\/c\/alpha\/collaborate\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { name: /campus bus tracker/i, level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Frontend developer" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Designer" })).toBeVisible();
  await expect(page.getByText(/helps if you know: python/i)).toBeVisible();
  await expectNoSidewaysScroll(page);

  // The list, with filters
  await page.goto("/c/alpha/collaborate");
  const row = page.getByRole("link", { name: /campus bus tracker/i });
  await expect(row).toBeVisible();
  await expect(page.getByText("Yours").first()).toBeVisible();
  await expectNoSidewaysScroll(page);
  await page.getByRole("button", { name: "Hackathon" }).click();
  await expect(page.getByText(/no plans match these filters/i)).toBeVisible();
  await page.getByRole("button", { name: "Project" }).click();
  await expect(row).toBeVisible();
  await page.getByLabel(/search plans/i).fill("zzzz-nothing");
  await expect(page.getByText(/no plans match these filters/i)).toBeVisible();
  await page.getByLabel(/search plans/i).fill("bus tracker");
  await expect(row).toBeVisible();
  await page.getByRole("button", { name: "Mine" }).click();
  await expect(row).toBeVisible();

  // Edit
  await row.click();
  await page.getByRole("link", { name: /^edit/i }).click();
  await page.getByLabel(/^title/i).fill("Campus bus tracker, now with a map");
  await page.getByRole("button", { name: /save changes/i }).click();
  await expect(page.getByRole("heading", { name: /now with a map/i, level: 1 })).toBeVisible();

  // Close
  await page.getByRole("button", { name: /close the post/i }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /close the post/i })
    .click();
  await expect(page.getByText(/the author closed this post/i)).toBeVisible();
  await expect(page.getByRole("link", { name: /^edit/i })).toHaveCount(0);
  await page.goto("/c/alpha/collaborate");
  await expect(page.getByText(/no plans yet/i)).toBeVisible();
  // My own posts still show what I closed.
  await page.getByRole("button", { name: "Mine" }).click();
  await expect(page.getByRole("link", { name: /now with a map/i })).toBeVisible();
});

test("a student in a college and in Global can post to Global", async ({ page }) => {
  await memberOfAlpha(page, "TF3");
  await joinGlobalThroughUi(page);
  await page.goto("/c/alpha/collaborate/new");
  await expect(page.getByRole("radio", { name: /public/i })).toBeVisible();
  await expect(page.getByRole("radio", { name: /alpha college/i })).toBeChecked();
  await page.getByRole("radio", { name: /public/i }).check();
  await fillPost(page, "Open source note taking app, all colleges welcome");
  await page.getByRole("button", { name: /^post plan$/i }).click();
  await expect(page).toHaveURL(/\/c\/global\/collaborate\/[0-9a-f-]{36}$/);
  await expect(
    page.getByRole("heading", { name: /open source note taking/i, level: 1 }),
  ).toBeVisible();
  // It lives in Global, and it is shown to every college too (Alpha's list has it, tagged Public)
  await page.goto("/c/alpha/collaborate");
  await expect(page.getByRole("link", { name: /open source note taking/i })).toBeVisible();
  await page.goto("/c/global/collaborate");
  await expect(page.getByRole("link", { name: /open source note taking/i })).toBeVisible();
});

test("a member of a college can post publicly without joining anything", async ({ page }) => {
  await memberOfAlpha(page, "TF4");
  await page.goto("/c/alpha/collaborate/new");
  // The app adds every member to the public space on the first visit, so the public choice is there.
  await expect(page.getByRole("radio", { name: /public/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /join global/i })).toHaveCount(0);
});

test("Your spaces in Settings lets a phone switch to Global", async ({ page }) => {
  await memberOfAlpha(page, "TF5");
  await joinGlobalThroughUi(page);
  await page.goto("/c/alpha/me/settings");
  await expect(page.getByRole("heading", { name: /your spaces/i })).toBeVisible();
  await page.getByRole("link", { name: "Open" }).click();
  await expect(page).toHaveURL(/\/c\/global\/home$/);
  await expectNoSidewaysScroll(page);
});
