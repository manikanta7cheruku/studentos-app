import { expect, test, type Page } from "@playwright/test";
import { cleanUp, createOpportunity, memberOfAlpha, uniqueIp } from "./helpers";

// Browser journeys for R3 Day 7 (the application tracker and the opportunities), desktop and phone, against the
// real backend: add, filter, move along, edit, conflict on two screens, delete, save an opportunity, add it to the
// tracker.

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

async function addApplication(page: Page, company: string, role: string, deadline?: string) {
  await page.goto("/c/alpha/career/tracker/new");
  await page.getByLabel(/^company or organisation/i).fill(company);
  await page.getByLabel(/^role/i).fill(role);
  if (deadline) await page.getByLabel(/^deadline/i).fill(deadline);
  await page.getByRole("button", { name: /add to my tracker/i }).click();
  await expect(page).toHaveURL(/\/c\/alpha\/career\/tracker\/[0-9a-f-]{36}$/);
}

const inDays = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

test("the empty tracker invites the first application", async ({ page }) => {
  await memberOfAlpha(page, "CR0");
  await page.goto("/c/alpha/career");
  await expect(page.getByRole("heading", { name: /my applications/i, level: 1 })).toBeVisible();
  await expect(page.getByText(/nothing here yet/i)).toBeVisible();
  await expect(page.getByRole("link", { name: "Opportunities" })).toBeVisible();
  await expectNoSidewaysScroll(page);
});

test("a missing company is explained before sending", async ({ page }) => {
  await memberOfAlpha(page, "CR1");
  await page.goto("/c/alpha/career/tracker/new");
  await page.getByRole("button", { name: /add to my tracker/i }).click();
  await expect(page.getByText(/enter the company or organisation/i)).toBeVisible();
  await expect(page.getByText(/enter the role/i)).toBeVisible();
  await expectNoSidewaysScroll(page);
});

test("add, find, filter, move along, edit and delete an application", async ({ page }) => {
  await memberOfAlpha(page, "CR2");
  await addApplication(page, "Acme Robotics", "Frontend intern", inDays(3));
  await expect(page.getByRole("heading", { name: "Acme Robotics", level: 1 })).toBeVisible();
  await expect(page.getByText(/due in 3 days/i)).toBeVisible();
  await expectNoSidewaysScroll(page);
  await addApplication(page, "Beta Labs", "Data analyst", inDays(10));

  // The list, filters and sort
  await page.goto("/c/alpha/career");
  await expect(page.getByRole("link", { name: "Acme Robotics" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Beta Labs" })).toBeVisible();
  await expectNoSidewaysScroll(page);
  await page.getByLabel(/search applications/i).fill("beta");
  await expect(page.getByRole("link", { name: "Acme Robotics" })).toHaveCount(0);
  await page.getByLabel(/search applications/i).fill("");

  // Move along, with a note
  await page.getByRole("link", { name: "Acme Robotics" }).click();
  await page.getByRole("button", { name: "Applied" }).click();
  await page.getByLabel(/note for the move to applied/i).fill("Sent the form");
  await page.getByRole("button", { name: /move to applied/i }).click();
  await expect(page.getByText("Sent the form")).toBeVisible();
  await expect(page.getByText(/applied on|^Applied /i).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /^applied/i })).toBeDisabled();

  // The status filter now has an Applied chip with one in it
  await page.goto("/c/alpha/career");
  await page.getByRole("button", { name: /^applied 1/i }).click();
  await expect(page.getByRole("link", { name: "Acme Robotics" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Beta Labs" })).toHaveCount(0);

  // Edit
  await page.getByRole("link", { name: "Acme Robotics" }).click();
  await page.getByRole("link", { name: /^edit/i }).click();
  await page.getByLabel(/^notes/i).fill("Phone screen on Monday");
  await page.getByRole("button", { name: /save changes/i }).click();
  await expect(page.getByText("Phone screen on Monday")).toBeVisible();

  // Delete
  await page.getByRole("button", { name: "Delete" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
  await expect(page).toHaveURL(/\/c\/alpha\/career$/);
  await expect(page.getByRole("link", { name: "Acme Robotics" })).toHaveCount(0);
});

test("a change made on another screen is noticed, not overwritten", async ({ page, context }) => {
  await memberOfAlpha(page, "CR3");
  await addApplication(page, "Gamma Works", "Designer");
  const url = page.url();

  // The same application open on a second screen
  const other = await context.newPage();
  await other.goto(url);
  await expect(other.getByRole("heading", { name: "Gamma Works", level: 1 })).toBeVisible();

  // The first screen moves it along
  await page.getByRole("button", { name: "Applied" }).click();
  await page.getByRole("button", { name: /move to applied/i }).click();
  await expect(page.getByRole("button", { name: /^applied/i })).toBeDisabled();

  // The second screen still has the old version: its change is refused with a plain message
  await other.getByRole("button", { name: "Interview" }).click();
  await other.getByRole("button", { name: /move to interview/i }).click();
  await expect(other.getByText(/this changed somewhere else/i)).toBeVisible();
  await other.getByRole("button", { name: /load the latest/i }).click();
  await expect(other.getByRole("button", { name: /^applied/i })).toBeDisabled();
});

test("save an opportunity, add it to the tracker, and see it there", async ({ page }) => {
  const op = await createOpportunity("CR4");
  await memberOfAlpha(page, "CR4");
  await page.goto("/c/alpha/career/opportunities");
  await expect(page.getByRole("heading", { name: /opportunities/i, level: 1 })).toBeVisible();
  const row = page.getByRole("link", { name: op.title });
  await expect(row).toBeVisible();
  await expectNoSidewaysScroll(page);

  await row.click();
  await expect(page.getByRole("heading", { name: op.title, level: 1 })).toBeVisible();
  await expect(
    page.getByText(/₹15,000 to ₹20,000 a month/).filter({ visible: true }),
  ).toBeVisible();
  await expect(page.getByText("React", { exact: true }).filter({ visible: true })).toBeVisible();
  await expectNoSidewaysScroll(page);
  await expect(page.getByRole("link", { name: /apply on their site/i })).toHaveAttribute(
    "href",
    "https://careers.example.test/apply",
  );

  await page.getByRole("button", { name: /save for later/i }).click();
  await expect(page.getByRole("button", { name: /^saved$/i })).toBeVisible();

  await page.goto("/c/alpha/career/opportunities");
  await page.getByRole("button", { name: "Saved" }).click();
  await expect(page.getByRole("link", { name: op.title })).toBeVisible();

  await page.getByRole("link", { name: op.title }).click();
  await page.getByRole("button", { name: /add to my tracker/i }).click();
  await expect(page).toHaveURL(/\/c\/alpha\/career\/tracker\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { name: `E2E Org CR4`, level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: /from an opportunity/i })).toBeVisible();

  // The opportunity now says it is in the tracker
  await page.goto("/c/alpha/career/opportunities");
  await page.getByRole("link", { name: op.title }).click();
  await expect(page.getByRole("link", { name: /in your tracker/i })).toBeVisible();
});
