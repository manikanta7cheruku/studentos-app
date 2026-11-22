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
  const opener = page.getByRole("button", { name: /what is on your mind/i });
  await expect(opener).toBeVisible();
  await opener.click();
  const sheet = page.getByRole("dialog");
  await expect(sheet.getByRole("heading", { name: /new buzz/i })).toBeVisible();
  // Nothing to post yet
  await expect(sheet.getByRole("button", { name: /^post$/i })).toBeDisabled();
  const note = `Anyone up for chai after class ${Date.now().toString(36)}`;
  await sheet.getByLabel(/your buzz/i).fill(note);
  await sheet.getByRole("button", { name: "Food" }).click();
  await sheet.getByRole("button", { name: /^post$/i }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByText(note)).toBeVisible();

  // Cancel leaves nothing behind
  await page.getByRole("button", { name: /share another/i }).click();
  await page
    .getByRole("dialog")
    .getByLabel(/your buzz/i)
    .fill("A thought I will not send");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /^cancel$/i })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByText("A thought I will not send")).toHaveCount(0);
});
