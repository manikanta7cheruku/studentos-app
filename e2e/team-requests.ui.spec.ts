import {
  expect,
  test,
  type Browser,
  type BrowserContextOptions,
  type Page,
} from "@playwright/test";
import { cleanUp, memberOfAlpha, uniqueIp } from "./helpers";

// Browser journeys for R3 Day 6 (requests and decisions), desktop and phone, against the real backend, with two
// students: the author of a post and a classmate who asks to join it.

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

/** A second student in their own browser window, with the same device settings as the test. */
async function secondStudent(
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

async function makePost(page: Page, title: string, teamLink = "https://chat.example.com/room") {
  await page.goto("/c/alpha/collaborate/new");
  await page.getByLabel(/^title/i).fill(title);
  await page.getByLabel(/what are you building/i).fill("We need one designer for the weekend.");
  // The two link boxes sit behind one option, to keep the form short.
  await page.getByRole("button", { name: /add links/i }).click();
  await page.getByLabel(/team chat link/i).fill(teamLink);
  await page.getByPlaceholder("Frontend developer").first().fill("Designer");
  await page.getByRole("button", { name: /^post plan$/i }).click();
  await expect(page).toHaveURL(/\/c\/alpha\/collaborate\/[0-9a-f-]{36}$/);
  return new URL(page.url()).pathname;
}

test("ask to join, the author accepts, the applicant is on the team", async ({
  page,
  browser,
  contextOptions,
  baseURL,
}) => {
  await memberOfAlpha(page, "RQ1");
  const postPath = await makePost(page, "Weekend hackathon app, designer wanted");
  // The author does not see an Ask button on their own post.
  await expect(page.getByRole("button", { name: /ask to join/i })).toHaveCount(0);

  const applicant = await secondStudent(browser, contextOptions, baseURL, "RQ1B");
  await applicant.goto(postPath);
  await expect(
    applicant.getByRole("heading", { name: /weekend hackathon app/i, level: 1 }),
  ).toBeVisible();
  await expect(applicant.getByRole("link", { name: /team chat/i })).toHaveCount(0);
  await applicant.getByRole("button", { name: /ask to join/i }).click();
  await applicant.getByLabel(/a short message/i).fill("I design interfaces and can start tonight.");
  await applicant.getByRole("button", { name: /send request/i }).click();
  await expect(applicant.getByText(/you asked to join\. waiting for the author/i)).toBeVisible();
  await expect(applicant.getByRole("button", { name: /withdraw request/i })).toBeVisible();
  await expectNoSidewaysScroll(applicant);

  // The author sees the request and a notification that opens the post
  await page.goto("/c/alpha/notifications");
  await page
    .getByText(/asked to join/i)
    .first()
    .click();
  await expect(page).toHaveURL(new RegExp(`${postPath}$`));
  await expect(page.getByRole("heading", { name: /requests/i, level: 2 })).toBeVisible();
  await expect(page.getByText("I design interfaces and can start tonight.")).toBeVisible();
  await expectNoSidewaysScroll(page);
  await page.getByRole("button", { name: "Accept" }).click();
  await expect(page.getByText("Accepted", { exact: true })).toBeVisible();
  await expect(page.getByText(/no places left/i)).toBeVisible();
  await expect(page.getByText(/the team is full/i)).toBeVisible();

  // The applicant is on the team and can now see the team chat link
  await applicant.reload();
  await expect(applicant.getByText("You are on the team.")).toBeVisible();
  await expect(applicant.getByRole("link", { name: /team chat/i })).toBeVisible();
  await applicant.context().close();
});

test("the author declines with a note, the applicant reads it", async ({
  page,
  browser,
  contextOptions,
  baseURL,
}) => {
  await memberOfAlpha(page, "RQ2");
  const postPath = await makePost(page, "Robotics club project, one designer");
  const applicant = await secondStudent(browser, contextOptions, baseURL, "RQ2B");
  await applicant.goto(postPath);
  await applicant.getByRole("button", { name: /ask to join/i }).click();
  await applicant.getByRole("button", { name: /send request/i }).click();
  await expect(applicant.getByText(/waiting for the author/i)).toBeVisible();

  await page.goto("/c/alpha/collaborate/requests");
  await expect(page.getByRole("heading", { name: /waiting for your answer/i })).toBeVisible();
  await expect(page.getByText(/1 request waiting/i)).toBeVisible();
  await page.getByRole("link", { name: "Answer" }).click();
  await page.getByRole("button", { name: "Decline" }).click();
  await page.getByLabel(/a note for them/i).fill("We found someone already, thank you.");
  await page.getByRole("button", { name: "Decline" }).last().click();
  await expect(page.getByText("Declined", { exact: true })).toBeVisible();

  await applicant.goto("/c/alpha/collaborate/requests");
  await expect(applicant.getByText(/the author said no this time/i)).toBeVisible();
  await expect(applicant.getByText(/we found someone already/i)).toBeVisible();
  await expectNoSidewaysScroll(applicant);
  await applicant.context().close();
});

test("an applicant can withdraw a waiting request", async ({
  page,
  browser,
  contextOptions,
  baseURL,
}) => {
  await memberOfAlpha(page, "RQ3");
  const postPath = await makePost(page, "Study group app, a designer wanted");
  const applicant = await secondStudent(browser, contextOptions, baseURL, "RQ3B");
  await applicant.goto(postPath);
  await applicant.getByRole("button", { name: /ask to join/i }).click();
  await applicant.getByRole("button", { name: /send request/i }).click();
  await applicant.getByRole("button", { name: /withdraw request/i }).click();
  await expect(applicant.getByText(/you withdrew this request/i)).toBeVisible();

  await page.goto(postPath);
  await expect(page.getByText(/nobody has asked yet|withdrawn/i).first()).toBeVisible();
  await applicant.context().close();
});
