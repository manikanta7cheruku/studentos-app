import { expect, test } from "@playwright/test";
import { cleanUp, dayName, memberOfAlpha, pickDateTime, uniqueIp } from "./helpers";

// The shared pickers: numbers that roll and can be typed, and the glass date and time sheet. Desktop and phone.

test.describe.configure({ mode: "serial" });

test.beforeEach(async ({ context }) => {
  await context.setExtraHTTPHeaders({ "x-forwarded-for": uniqueIp() });
});

test.afterAll(async () => {
  await cleanUp();
});

const pad = (n: number) => String(n).padStart(2, "0");
const dayKey = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

test("a plan with a day and a time, picked on the glass sheet, with a number that steps and types", async ({
  page,
}) => {
  await memberOfAlpha(page, "PKR1");
  await page.goto("/c/alpha/collaborate/new");
  await page.getByRole("radio", { name: "Sport" }).click();
  await page.getByLabel(/^title/i).fill("Sunday football, six a side");

  // The number steps with the buttons and can be typed
  const players = page.getByRole("textbox", { name: "Players" });
  await expect(players).toHaveValue("10");
  await page.getByRole("button", { name: /more, players/i }).click();
  await page.getByRole("button", { name: /more, players/i }).click();
  await expect(players).toHaveValue("12");
  await players.fill("7");
  await expect(players).toHaveValue("7");
  await page.getByRole("button", { name: /fewer, players/i }).click();
  await expect(players).toHaveValue("6");

  // A quick choice fills the day and the time at once
  await page.getByRole("button", { name: /when does it start/i }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /^tomorrow 6 pm$/i })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /when does it start/i })).toContainText(/6:00/);

  // Or the calendar and the wheels: a day two days ahead, then the time
  const later = new Date(Date.now() + 2 * 86_400_000);
  await pickDateTime(page, /when does it start/i, dayKey(later));
  await expect(page.getByRole("dialog")).toHaveCount(0);

  await page.getByLabel(/^where/i).fill("Greenfield Turf");
  await page.getByRole("button", { name: /^post plan$/i }).click();
  await expect(page).toHaveURL(/\/c\/alpha\/collaborate\/[0-9a-f-]{36}$/);
  await expect(
    page.getByRole("heading", { name: /sunday football, six a side/i, level: 1 }),
  ).toBeVisible();
});

test("the time wheels change the time", async ({ page }) => {
  await memberOfAlpha(page, "PKR2");
  await page.goto("/c/alpha/collaborate/new");
  await page.getByRole("radio", { name: "Hangout" }).click();
  await page.getByRole("button", { name: /when does it start/i }).click();
  const sheet = page.getByRole("dialog");
  const tomorrow = new Date(Date.now() + 86_400_000);
  await sheet
    .getByRole("button", { name: await dayName(page, dayKey(tomorrow)), exact: true })
    .click();
  // On the time tab, tap items on the wheels
  await sheet.getByRole("option", { name: "9", exact: true }).first().click();
  await sheet.getByRole("option", { name: "pm", exact: true }).click();
  await sheet.getByRole("option", { name: "30", exact: true }).click();
  await sheet.getByRole("button", { name: /^done$/i }).click();
  await expect(page.getByRole("button", { name: /when does it start/i })).toContainText(/9:30/);
});
