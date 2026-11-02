import { expect, test } from "@playwright/test";

// Browser smoke test: the home page opens in a desktop and a phone browser, shows a heading,
// has no browser errors, and does not scroll sideways on a phone (a rule from docs/DESIGN_SYSTEM.md).
// More screens are added by R3 and R4 as they build them (sign in and join screens come next).

test("the home page opens without browser errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });

  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
  await expect(page.locator("h1").first()).toBeVisible();
  expect(errors).toEqual([]);
});

test("the home page does not scroll sideways", async ({ page }) => {
  await page.goto("/");
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
