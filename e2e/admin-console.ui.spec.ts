import {
  expect,
  test,
  type Browser,
  type BrowserContextOptions,
  type Page,
} from "@playwright/test";
import {
  cleanUp,
  createOpportunity,
  memberOfAlpha,
  setAlphaRole,
  signInThroughUi,
  uniqueEmail,
  uniqueIp,
} from "./helpers";

// Browser journeys for R3 Day 8: the admin console on real data, reports, and the four states (loading, empty, error,
// offline), desktop and phone, against the real local backend.

test.describe.configure({ mode: "serial" });
test.setTimeout(120_000);

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

/** A new Alpha member who the owner has made an admin. The page is reloaded so the new role is read. */
async function adminPage(page: Page, label: string): Promise<string> {
  const email = await memberOfAlpha(page, label);
  await setAlphaRole(email, "college_admin");
  await page.goto("/c/alpha/admin");
  return email;
}

async function secondStudent(
  browser: Browser,
  contextOptions: BrowserContextOptions,
  baseURL: string | undefined,
): Promise<Page> {
  const context = await browser.newContext({
    ...contextOptions,
    baseURL,
    extraHTTPHeaders: { "x-forwarded-for": uniqueIp() },
  });
  return context.newPage();
}

test("a student cannot open the admin console", async ({ page }) => {
  await memberOfAlpha(page, "ADM0");
  await page.goto("/c/alpha/admin");
  await expect(
    page.getByRole("heading", { name: /for college admins and moderators/i }),
  ).toBeVisible();
  await expectNoSidewaysScroll(page);
});

test("the overview shows the numbers and the navigation", async ({ page }) => {
  await adminPage(page, "ADM1");
  await expect(page.getByRole("heading", { name: /console/i, level: 1 })).toBeVisible();
  await expect(
    page.getByText("Members", { exact: true }).filter({ visible: true }).first(),
  ).toBeVisible();
  const nav = page.getByRole("navigation", { name: "Admin" });
  for (const name of [
    "Join requests",
    "Members",
    "Invite codes",
    "Announcements",
    "Opportunities",
    "Reports",
    "Settings",
    "Audit log",
  ]) {
    await expect(nav.getByRole("link", { name })).toBeVisible();
  }
  await expectNoSidewaysScroll(page);
});

test("create an invite code, show it once, and a new student joins with it", async ({
  page,
  browser,
  contextOptions,
  baseURL,
}) => {
  await adminPage(page, "ADM2");
  await page.goto("/c/alpha/admin/invites");
  await expect(page.getByText(/no invite codes yet|invite codes/i).first()).toBeVisible();
  await page.getByLabel(/^name/i).fill("Console test batch");
  await page.getByLabel(/how many people can use it/i).fill("3");
  await page.getByRole("button", { name: /create the code/i }).click();
  const codeBox = page.locator("p.font-mono");
  await expect(codeBox).toBeVisible();
  const code = (await codeBox.innerText()).trim();
  expect(code).toMatch(/^[A-Z0-9-]{6,32}$/);
  await expect(
    page.getByText("Console test batch").filter({ visible: true }).first(),
  ).toBeVisible();
  await expectNoSidewaysScroll(page);

  // A new student uses it
  const student = await secondStudent(browser, contextOptions, baseURL);
  await signInThroughUi(student, uniqueEmail(), "/c/alpha/join");
  await student
    .getByLabel(/invite code/i)
    .last()
    .fill(code);
  await student.getByRole("button", { name: /join with this code/i }).click();
  await expect(student).toHaveURL(/\/c\/alpha\/home$/);
  await student.context().close();

  // Revoke
  await page.reload();
  await page.getByRole("button", { name: "Revoke" }).first().click();
  await page.getByRole("dialog").getByRole("button", { name: "Revoke" }).click();
  await expect(page.getByText(/revoked/i).first()).toBeVisible();
});

test("a manual join request is approved by the admin", async ({
  page,
  browser,
  contextOptions,
  baseURL,
}) => {
  await adminPage(page, "ADM3");
  const student = await secondStudent(browser, contextOptions, baseURL);
  const email = uniqueEmail();
  await signInThroughUi(student, email, "/c/alpha/join");
  await student.getByRole("button", { name: /ask to join/i }).click();
  await student.getByLabel(/enrolment number/i).fill("ENROLL-4242");
  await student.getByLabel(/^course/i).fill("B.Tech CSE");
  await student.getByLabel(/year you finish/i).fill(String(new Date().getFullYear() + 2));
  await student.getByRole("button", { name: /^ask to join$/i }).click();
  await expect(student).toHaveURL(/\/c\/alpha\/pending$/);

  await page.goto("/c/alpha/admin/verification");
  await expect(page.getByText(email).first()).toBeVisible();
  await expect(page.getByText("4242").first()).toBeVisible();
  await expectNoSidewaysScroll(page);
  await page.getByRole("button", { name: "Approve" }).first().click();
  await expect(page.getByText(/nobody is waiting/i)).toBeVisible();

  // The student is in
  await student.getByRole("button", { name: /check now/i }).click();
  await expect(student).toHaveURL(/\/c\/alpha\/home$/);
  await student.context().close();
});

test("an announcement posted by the admin shows on Campus", async ({
  page,
  browser,
  contextOptions,
  baseURL,
}) => {
  await adminPage(page, "ADM4");
  await page.goto("/c/alpha/admin/announcements");
  await page.getByRole("button", { name: /new notice/i }).click();
  await page.getByLabel(/^title/i).fill("E2E Library closed on Friday");
  await page.getByLabel(/^notice/i).fill("The library is closed for maintenance this Friday.");
  await page.getByRole("button", { name: /^publish$/i }).click();
  await expect(
    page.getByText("E2E Library closed on Friday").filter({ visible: true }).first(),
  ).toBeVisible();
  await expectNoSidewaysScroll(page);

  const student = await secondStudent(browser, contextOptions, baseURL);
  await memberOfAlpha(student, "ADM4B");
  await student.goto("/c/alpha/campus");
  await expect(
    student.getByRole("heading", { name: "E2E Library closed on Friday" }),
  ).toBeVisible();
  await student.context().close();
});

test("an opportunity posted by the admin shows under Career", async ({
  page,
  browser,
  contextOptions,
  baseURL,
}) => {
  await adminPage(page, "ADM5");
  await page.goto("/c/alpha/admin/opportunities");
  await page.getByRole("button", { name: /new opportunity/i }).click();
  await page.getByLabel(/^title/i).fill("E2E console data intern");
  await page.getByLabel(/^company or organisation/i).fill("E2E Console Org");
  await page.getByLabel(/link to apply/i).fill("https://careers.example.test/data");
  await page.getByRole("button", { name: /^publish$/i }).click();
  await expect(
    page.getByText("E2E console data intern").filter({ visible: true }).first(),
  ).toBeVisible();

  const student = await secondStudent(browser, contextOptions, baseURL);
  await memberOfAlpha(student, "ADM5B");
  await student.goto("/c/alpha/career/opportunities");
  await expect(student.getByRole("link", { name: "E2E console data intern" })).toBeVisible();
  await student.context().close();
});

test("a member reports a team post and the admin dismisses the report", async ({
  page,
  browser,
  contextOptions,
  baseURL,
}) => {
  const student = await secondStudent(browser, contextOptions, baseURL);
  await memberOfAlpha(student, "ADM6A");
  await student.goto("/c/alpha/collaborate/new");
  await student.getByLabel(/^title/i).fill("Suspicious team post for reporting");
  await student.getByPlaceholder("Frontend developer").first().fill("Anyone");
  await student.getByRole("button", { name: /^post plan$/i }).click();
  await expect(student).toHaveURL(/\/c\/alpha\/collaborate\/[0-9a-f-]{36}$/);
  const postPath = new URL(student.url()).pathname;

  await adminPage(page, "ADM6B");
  await page.goto(postPath);
  await page.getByRole("button", { name: /report/i }).click();
  await page.getByRole("radio", { name: "Spam" }).check();
  await page.getByRole("button", { name: /send report/i }).click();
  await expect(page.getByText(/thank you/i)).toBeVisible();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Close", exact: true })
    .first()
    .click();

  await page.goto("/c/alpha/admin/reports");
  const card = page.getByRole("listitem").filter({ hasText: "Suspicious team post for reporting" });
  await expect(card.getByText(/spam: a team post/i)).toBeVisible();
  await expectNoSidewaysScroll(page);
  await card.getByRole("button", { name: /dismiss/i }).click();
  await card.getByRole("button", { name: "Confirm" }).click();
  await expect(card).toHaveCount(0);
  await student.context().close();
});

test("settings are saved and the audit log shows the change", async ({ page }) => {
  await adminPage(page, "ADM7");
  await page.goto("/c/alpha/admin/settings");
  await expect(page.getByRole("heading", { name: "Settings", level: 1 })).toBeVisible();
  await page.getByRole("switch", { name: /^campus/i }).click();
  await page.getByRole("button", { name: /save settings/i }).click();
  await expect(page.getByRole("status").filter({ hasText: /saved/i })).toBeVisible();
  // Put it back, so other tests are not affected
  await page.getByRole("switch", { name: /^campus/i }).click();
  await page.getByRole("button", { name: /save settings/i }).click();
  await expect(page.getByRole("status").filter({ hasText: /saved/i })).toBeVisible();
  await page.goto("/c/alpha/admin/audit");
  await expect(page.getByText(/changed the settings/i).first()).toBeVisible();
  await expectNoSidewaysScroll(page);
});

test("members can be searched and a member can be suspended and reactivated", async ({
  page,
  browser,
  contextOptions,
  baseURL,
}) => {
  const student = await secondStudent(browser, contextOptions, baseURL);
  const studentEmail = await memberOfAlpha(student, "ADM8A");
  await adminPage(page, "ADM8B");
  await page.goto("/c/alpha/admin/members");
  await expect(page.getByRole("heading", { name: "Members", level: 1 })).toBeVisible();
  const term = studentEmail.split("@")[0]!.slice(0, 12);
  // The list is searched a moment after typing stops: wait for that answer before touching a row
  const searched = page.waitForResponse(
    (r) => r.url().includes("/admin/members") && r.url().includes("q="),
  );
  await page.getByLabel("Search members").fill(term);
  await searched;
  const row = page.getByRole("listitem").filter({ hasText: term });
  await expect(row).toHaveCount(1);
  await expectNoSidewaysScroll(page);

  await row.getByRole("button", { name: "Suspend" }).click();
  await page.getByLabel(/^reason/i).fill("Testing the suspend flow");
  await page.getByRole("dialog").getByRole("button", { name: "Confirm" }).click();
  await expect(row.getByText(/suspended/i)).toBeVisible();

  await row.getByRole("button", { name: "Reactivate" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Confirm" }).click();
  await expect(row.getByText(/Student · Active/)).toBeVisible();
  await student.context().close();
});

test("when the connection drops the app says so, and comes back by itself", async ({
  page,
  context,
}) => {
  await memberOfAlpha(page, "ADM9");
  await page.goto("/c/alpha/collaborate");
  await expect(page.getByRole("heading", { name: /^plans$/i, level: 1 })).toBeVisible();
  await context.setOffline(true);
  await expect(page.getByText(/you are offline/i)).toBeVisible();
  await context.setOffline(false);
  await expect(page.getByText(/you are offline/i)).toHaveCount(0);
});

test("a screen that cannot load shows a retry, and works after it", async ({ page }) => {
  await memberOfAlpha(page, "ADM10");
  // The server "is down" for the list until we say it is back (the development server asks twice, so a counter would not work)
  let broken = true;
  await page.route(/\/api\/v1\/c\/alpha\/team-posts\?/, async (route) => {
    if (broken) await route.abort("failed");
    else await route.continue();
  });
  await page.goto("/c/alpha/collaborate");
  await expect(page.getByText(/we could not load the team posts/i)).toBeVisible();
  broken = false;
  await page.getByRole("button", { name: /try again/i }).click();
  await expect(page.getByRole("heading", { name: /^plans$/i, level: 1 })).toBeVisible();
  await expect(page.getByText(/we could not load the team posts/i)).toHaveCount(0);
});

test("opportunities seeded by the owner are listed for students", async ({ page }) => {
  const op = await createOpportunity("ADM11");
  await memberOfAlpha(page, "ADM11");
  await page.goto("/c/alpha/career/opportunities");
  await expect(page.getByRole("link", { name: op.title })).toBeVisible();
});
