import { expect, test } from "@playwright/test";
import { cleanUp, memberOfAlpha, uniqueIp } from "./helpers";

// The one-line box at the top of Buzz opens a glass sheet, and a buzz posted from it shows in the list. Desktop and phone.

test.beforeEach(async ({ context }) => {
  await context.setExtraHTTPHeaders({ "x-forwarded-for": uniqueIp() });
});

test.afterAll(async () => {
  await cleanUp();
});

test("post a buzz from the one-line box", async ({ page }) => {
  await memberOfAlpha(page, "BZ1");
  await page.goto("/c/alpha/ideas");
  const box = page.getByLabel(/your buzz/i);
  await expect(box).toBeVisible();
  // Closed it is one line with no buttons; tapping opens it with the topics and Post
  await expect(page.getByRole("button", { name: /^post$/i })).toBeHidden();
  await box.click();
  await expect(page.getByRole("button", { name: /^post$/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /^post$/i })).toBeDisabled();
  const note = `Anyone up for chai after class ${Date.now().toString(36)}`;
  await box.fill(note);
  await page.getByRole("group", { name: "Topic" }).getByRole("button", { name: "Food" }).click();
  await page.getByRole("button", { name: /^post$/i }).click();
  await expect(page.getByText(note)).toBeVisible();
  // It folds back to one line
  await expect(page.getByRole("button", { name: /^post$/i })).toBeHidden();

  // Cancel folds it and clears the draft
  await box.click();
  await box.fill("A thought I will not send");
  await page.getByRole("button", { name: /^cancel$/i }).click();
  await expect(page.getByRole("button", { name: /^post$/i })).toBeHidden();
  await expect(box).toHaveValue("");
});
