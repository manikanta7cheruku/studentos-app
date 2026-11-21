import {
  expect,
  test,
  type Browser,
  type BrowserContextOptions,
  type Page,
} from "@playwright/test";
import { cleanUp, memberOfAlpha, uniqueIp } from "./helpers";

// Turf and courts: a game at a venue. Two students and a third on the waiting list, against the real backend, desktop and phone.

test.describe.configure({ mode: "serial" });

test.beforeEach(async ({ context }) => {
  await context.setExtraHTTPHeaders({ "x-forwarded-for": uniqueIp() });
});

test.afterAll(async () => {
  await cleanUp();
});

async function student(
  browser: Browser,
  contextOptions: BrowserContextOptions,
  baseURL: string | undefined,
  label: string,
): Promise<Page> {
  const context = await browser.newContext({
    ...contextOptions,
    baseURL,
    extraHTTPHeaders: { "x-forwarded-for": uniqueIp() },
  });
  const page = await context.newPage();
  await memberOfAlpha(page, label);
  return page;
}

test("set up a game, fill it, wait in line, drop out and the place passes on", async ({
  page,
  browser,
  contextOptions,
  baseURL,
}) => {
  await memberOfAlpha(page, "TRF1");
  await page.goto("/c/alpha/turf");
  await expect(page.getByRole("heading", { name: /turf and courts/i, level: 1 })).toBeVisible();
  await expect(page.getByText(/no games yet/i)).toBeVisible();

  // The host sets up a game for two players
  await page
    .getByRole("link", { name: /set up a game/i })
    .first()
    .click();
  await expect(page).toHaveURL(/\/turf\/new$/);
  await page.getByRole("button", { name: "Football" }).click();
  await page.getByLabel(/turf or court/i).fill("Greenfield Turf");
  await page.getByLabel(/area or landmark/i).fill("Gate 2");
  // The counter starts at 10 players: eight taps down to 2
  for (let step = 0; step < 8; step += 1)
    await page.getByRole("button", { name: /fewer, players/i }).click();
  await page.getByLabel(/each person pays/i).fill("150");
  await page.getByRole("button", { name: /set up game/i }).click();
  await expect(page).toHaveURL(/\/turf\/[0-9a-f-]{36}$/);
  const path = new URL(page.url()).pathname;
  await expect(page.getByRole("heading", { name: "Greenfield Turf", level: 1 })).toBeVisible();
  await expect(page.getByText("₹150").first()).toBeVisible();
  await expect(page.getByText(/1 of 2 in/i).first()).toBeVisible();
  // The host cannot join their own game
  await expect(page.getByRole("button", { name: /^join game$/i })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /cancel game/i })).toBeVisible();

  // A second student joins, and it is full
  const second = await student(browser, contextOptions, baseURL, "TRF1B");
  await second.goto("/c/alpha/turf");
  await expect(second.getByRole("link", { name: "Greenfield Turf" })).toBeVisible();
  await second.goto(path);
  await second.getByRole("button", { name: /^join game$/i }).click();
  await expect(second.getByText(/you are in/i).first()).toBeVisible();
  await expect(second.getByText(/2 of 2 in/i).first()).toBeVisible();

  // A third student finds it full and joins the waiting list
  const third = await student(browser, contextOptions, baseURL, "TRF1C");
  await third.goto(path);
  await third.getByRole("button", { name: /join the waiting list/i }).click();
  await expect(third.getByText(/waiting list, number 1/i)).toBeVisible();

  // The second student cannot make it: a sheet asks first, then the place goes to the third
  await second.getByRole("button", { name: /i cannot make it/i }).click();
  const sheet = second.getByRole("dialog");
  await expect(sheet.getByText(/goes to the next person waiting/i)).toBeVisible();
  await sheet.getByRole("button", { name: /i cannot make it/i }).click();
  // The place passed on, so the game is full again for the one who dropped out
  await expect(second.getByRole("button", { name: /join the waiting list/i })).toBeVisible();
  await third.reload();
  await expect(third.getByText(/you are in/i).first()).toBeVisible();

  // The host sees both in the list, then cancels
  await page.reload();
  await expect(page.getByText(/2 of 2 in/i).first()).toBeVisible();
  await page.getByRole("button", { name: /cancel game/i }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /^cancel game$/i })
    .click();
  await expect(page.getByText(/the host cancelled this game/i)).toBeVisible();
  await third.reload();
  await expect(third.getByText(/the host cancelled this game/i)).toBeVisible();

  await second.context().close();
  await third.context().close();
});

test("a game the host approves: ask, get accepted", async ({
  page,
  browser,
  contextOptions,
  baseURL,
}) => {
  await memberOfAlpha(page, "TRF2");
  await page.goto("/c/alpha/turf/new");
  await page.getByRole("button", { name: "Cricket" }).click();
  await page.getByLabel(/turf or court/i).fill("Nets Ground");
  await page.getByRole("radio", { name: /i approve each person/i }).click();
  await page.getByRole("button", { name: /set up game/i }).click();
  await expect(page).toHaveURL(/\/turf\/[0-9a-f-]{36}$/);
  const path = new URL(page.url()).pathname;

  const guest = await student(browser, contextOptions, baseURL, "TRF2B");
  await guest.goto(path);
  await guest.getByRole("button", { name: /^ask to join$/i }).click();
  await expect(guest.getByText(/request sent/i)).toBeVisible();

  await page.reload();
  await expect(page.getByText(/waiting for your answer/i)).toBeVisible();
  await page.getByRole("button", { name: /^accept /i }).click();
  await expect(page.getByText(/2 of 10 in/i).first()).toBeVisible();

  await guest.reload();
  await expect(guest.getByText(/you are in/i).first()).toBeVisible();
  await guest.context().close();
});
