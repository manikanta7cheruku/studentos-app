import { expect, test, type Page } from "@playwright/test";
import { cleanUp, codeFor, createInvite, signInThroughUi, uniqueEmail, uniqueIp } from "./helpers";

// Browser journeys for R3 Day 3 (profile), desktop and phone, against the real backend: a new member joins, edits the
// profile and skills, sees classmates, changes privacy, uses a root address, leaves the college, deletes the account.

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

/** A new student who has joined Alpha College with an invite code. */
async function member(page: Page, label: string): Promise<string> {
  const email = uniqueEmail();
  const invite = await createInvite(label);
  await signInThroughUi(page, email, "/c/alpha/join");
  await page
    .getByLabel(/invite code/i)
    .last()
    .fill(invite);
  await page.getByRole("button", { name: /join with this code/i }).click();
  await expect(page).toHaveURL(/\/c\/alpha\/home$/);
  return email;
}

// A 1x1 PNG.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

test("edit the profile, add skills, and see them on my page", async ({ page }) => {
  await member(page, "PRF1");
  await page.goto("/c/alpha/me");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expectNoSidewaysScroll(page);

  await page.getByRole("link", { name: /edit profile/i }).click();
  await expect(page.getByRole("heading", { name: /edit profile/i })).toBeVisible();
  await page.getByLabel(/^name/i).fill("Asha Rao");
  await page.getByLabel(/^username/i).fill("asha_rao");
  await page.getByLabel(/^headline/i).fill("Third year CSE, building sensors");
  await page.getByRole("button", { name: "Football", exact: true }).click();
  await page.getByLabel(/add your own: for fun/i).fill("robotics");
  await page.getByRole("button", { name: "Add", exact: true }).first().click();
  await expect(page.getByRole("button", { name: /remove robotics/i })).toBeVisible();
  await expectNoSidewaysScroll(page);
  await page.getByRole("button", { name: /save changes/i }).click();

  await expect(page).toHaveURL(/\/c\/alpha\/me$/);
  await expect(page.getByRole("heading", { name: "Asha Rao" })).toBeVisible();
  await expect(page.getByText("@asha_rao")).toBeVisible();
  await expect(page.getByText("Third year CSE, building sensors")).toBeVisible();

  await page.getByRole("link", { name: /^strengths/i }).click();
  await page.getByLabel(/add a strength/i).fill("Pyth");
  await page.getByRole("button", { name: "Python", exact: true }).click();
  await expect(page.getByRole("heading", { name: /your strengths \(1 of 5\)/i })).toBeVisible();
  await expectNoSidewaysScroll(page);
  await page.getByRole("button", { name: /save strengths/i }).click();
  await expect(page).toHaveURL(/\/c\/alpha\/me$/);
  await expect(page.getByText("Python", { exact: true }).filter({ visible: true })).toBeVisible();
});

test("a handle that is not allowed is explained before saving", async ({ page }) => {
  await member(page, "PRF2");
  await page.goto("/c/alpha/me/edit");
  await page.getByLabel(/^username/i).fill("No Spaces!");
  await page.getByRole("button", { name: /save changes/i }).click();
  await expect(page.getByText(/lowercase letters, numbers or underscores/i)).toBeVisible();
});

test("a profile picture can be uploaded", async ({ page }) => {
  await member(page, "PRF3");
  await page.goto("/c/alpha/me/edit");
  await page.locator('input[type="file"]').setInputFiles({
    name: "me.png",
    mimeType: "image/png",
    buffer: PNG,
  });
  await expect(page.getByRole("button", { name: /change photo/i })).toBeVisible();
});

test("a picture that is not an image is refused in plain words", async ({ page }) => {
  await member(page, "PRF4");
  await page.goto("/c/alpha/me/edit");
  await page.locator('input[type="file"]').setInputFiles({
    name: "notes.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("hello"),
  });
  await expect(page.getByText(/JPEG, PNG, WebP, GIF or AVIF picture/i).first()).toBeVisible();
});

test("people shows classmates and can be searched", async ({ page }) => {
  await member(page, "PRF5");
  await page.goto("/c/alpha/people");
  await expect(page.getByRole("heading", { name: "People" })).toBeVisible();
  await expectNoSidewaysScroll(page);
  await page.getByLabel(/search people/i).fill("zzzz-nobody");
  await expect(page.getByText(/nobody found/i)).toBeVisible();
});

test("privacy and reminder choices are saved", async ({ page }) => {
  await member(page, "PRF6");
  await page.goto("/c/alpha/me/settings");
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  await page.getByLabel(/show my profile to my college/i).click();
  await expect(page.getByRole("status").filter({ hasText: /hidden/i })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel(/show my profile to my college/i)).not.toBeChecked();
  await expectNoSidewaysScroll(page);
});

test("the old address /me opens my profile inside my college", async ({ page }) => {
  await member(page, "PRF7");
  await page.goto("/me");
  await expect(page).toHaveURL(/\/c\/alpha\/me$/);
});

test("leaving the college returns to the find page", async ({ page }) => {
  await member(page, "PRF8");
  await page.goto("/c/alpha/me/settings");
  await page.getByRole("button", { name: /^leave /i }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /leave college/i })
    .click();
  await expect(page).toHaveURL(/\/find$/);
});

test("deleting the account takes two steps and ends the session", async ({ page }) => {
  const email = await member(page, "PRF9");
  await page.goto("/c/alpha/me/settings");
  await page.getByRole("button", { name: /^delete account/i }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /email me the code/i })
    .click();
  await expect(page.getByRole("dialog").getByText(/enter the code to delete/i)).toBeVisible();
  await page
    .getByRole("dialog")
    .getByLabel(/six digit code/i)
    .fill(await codeFor(email));
  await expect(page).toHaveURL(/localhost:\d+\/$/);
  await page.goto("/c/alpha/campus");
  await expect(page).toHaveURL(/\/signin/);
});
