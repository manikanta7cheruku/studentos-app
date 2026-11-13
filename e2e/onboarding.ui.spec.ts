import { expect, test } from "@playwright/test";
import { cleanUp, createInvite, signInOnly, uniqueEmail, uniqueIp } from "./helpers";

// The tour for a new person (R3 Day 17): name, a unique username, sex, interests, an optional note and number, a quick look.
// Real backend, desktop and phone.

test.describe.configure({ mode: "serial" });

test.beforeEach(async ({ context }) => {
  await context.setExtraHTTPHeaders({ "x-forwarded-for": uniqueIp() });
});

test.afterAll(async () => {
  await cleanUp();
});

test("a new member goes through the tour once and then lands on Home", async ({ page }) => {
  const email = uniqueEmail();
  const invite = await createInvite("ONB1");
  await signInOnly(page, email, "/c/alpha/join");
  await page
    .getByLabel(/invite code/i)
    .last()
    .fill(invite);
  await page.getByRole("button", { name: /join with this code/i }).click();

  // Nothing else opens before the tour is done.
  await page.waitForURL(/\/welcome/);
  // First, why the app is worth it
  await expect(page.getByRole("heading", { name: /welcome to/i })).toBeVisible();
  await page.getByRole("button", { name: /get started/i }).click();
  await expect(page.getByRole("heading", { name: /who are you/i })).toBeVisible();

  // Step 1: the username is a must, sex too (and "prefer not to say" is an answer)
  await page.getByLabel(/^username/i).fill("ab");
  await page.getByRole("radio", { name: /prefer not to say/i }).click();
  await page.getByRole("button", { name: /^continue$/i }).click();
  await expect(page.getByText(/3 to 30 letters/i)).toBeVisible();
  await page.getByLabel(/^username/i).fill(`tour_${Date.now().toString(36)}`);
  await page.getByRole("button", { name: /^continue$/i }).click();
  // The college, the branch and the year are a must too
  await expect(page.getByText(/type the name of your college/i)).toBeVisible();
  await page.getByLabel(/^college/i).fill("Alpha College");
  await page
    .getByRole("button", { name: String(new Date().getFullYear() + 2), exact: true })
    .click();
  await page.getByRole("button", { name: /^continue$/i }).click();

  // Step 2: at least three interests
  await expect(page.getByRole("heading", { name: /what are you into/i })).toBeVisible();
  await page.getByRole("button", { name: "Football" }).click();
  await page.getByRole("button", { name: "Music" }).click();
  await page.getByRole("button", { name: /^continue$/i }).click();
  await expect(page.getByText(/at least 3/i)).toBeVisible();
  await page.getByRole("button", { name: "Web development" }).click();
  await page.getByRole("button", { name: /^continue$/i }).click();

  // Step 3 is optional
  await expect(page.getByRole("heading", { name: /anything else/i })).toBeVisible();
  await page.getByRole("button", { name: /^skip$/i }).click();

  // Step 4: the tour, then Home
  await expect(page.getByRole("heading", { name: /you are in/i })).toBeVisible();
  await page.getByRole("button", { name: /let.s go/i }).click();
  await page.waitForURL(/\/c\/alpha\/home$/);
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();

  // The tour does not come back
  await page.goto("/c/alpha/collaborate");
  await expect(page).toHaveURL(/\/c\/alpha\/collaborate$/);
});
