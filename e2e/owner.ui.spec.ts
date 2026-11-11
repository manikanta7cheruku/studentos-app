import { expect, test } from "@playwright/test";
import { cleanUp, memberOfAlpha, uniqueIp } from "./helpers";

// The owner dashboard must stay invisible to everyone except the owner. The owner's own PIN flow needs a real owner row,
// which is made by hand on purpose (pnpm owner:pin), so these journeys check the doors that must stay shut.

test.beforeEach(async ({ context }) => {
  await context.setExtraHTTPHeaders({ "x-forwarded-for": uniqueIp() });
});

test.afterAll(async () => {
  await cleanUp();
});

test("a visitor who is not signed in is sent to sign in", async ({ page }) => {
  await page.goto("/owner");
  await expect(page).toHaveURL(/\/signin\?next=%2Fowner/);
});

test("a signed in student gets the same page as for an address that does not exist", async ({
  page,
}) => {
  await memberOfAlpha(page, "OWN1");
  await page.goto("/owner");
  await expect(page.getByRole("heading", { name: /we could not find that page/i })).toBeVisible();
  await page.goto("/owner/codes");
  await expect(page.getByRole("heading", { name: /we could not find that page/i })).toBeVisible();
  await expect(page.getByText(/owner pin/i)).toHaveCount(0);
});
