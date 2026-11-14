import { randomUUID } from "node:crypto";
import {
  expect,
  test,
  type Browser,
  type BrowserContextOptions,
  type Page,
} from "@playwright/test";
import {
  cleanUp,
  codeFor,
  createInvite,
  memberOfAlpha,
  setAlphaRole,
  signInThroughUi,
  uniqueEmail,
  uniqueIp,
} from "./helpers";

// Browser journeys for R5 Day 3: the join paths that had no screen test yet.
//   1. join with a college email address (the code goes to that address, not to the sign in address)
//   2. an address that is not on the college's list is refused
//   3. an expired invite and a used up invite are explained on the screen
//   4. an admin rejects a manual request with a reason, and the student reads the reason
// Already covered elsewhere: good and wrong invite, manual request approved (signin-join.ui.spec.ts, admin-console.ui.spec.ts).

test.describe.configure({ mode: "serial" });
test.setTimeout(120_000);

test.beforeEach(async ({ context }) => {
  await context.setExtraHTTPHeaders({ "x-forwarded-for": uniqueIp() });
});

test.afterAll(async () => {
  await cleanUp();
});

const alert = (page: Page) => page.locator("[data-slot=banner][role=alert]");
const collegeAddress = (domain = "alpha.test") => `e2e-${randomUUID().slice(0, 8)}@${domain}`;

async function expectNoSidewaysScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

async function openJoinPage(page: Page) {
  await signInThroughUi(page, uniqueEmail(), "/c/alpha/join");
  await expect(page).toHaveURL(/\/c\/alpha\/join$/);
}

async function tryInviteCode(page: Page, code: string) {
  await page
    .getByLabel(/invite code/i)
    .last()
    .fill(code);
  await page.getByRole("button", { name: /join with this code/i }).click();
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

test("joining with a college email address: the code goes to that address and opens the campus", async ({
  page,
}) => {
  await openJoinPage(page);
  const address = collegeAddress();
  await page.getByRole("button", { name: /^college email/i }).click();
  await page.getByLabel(/college email address/i).fill(address);
  await page.getByRole("button", { name: /email me a code/i }).click();
  await expect(page.getByText(address)).toBeVisible();
  await page.getByLabel(/six digit code from your college email/i).fill(await codeFor(address));
  await expect(page).toHaveURL(/\/c\/alpha\/home$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expectNoSidewaysScroll(page);
});

test("a college email address that is not on the college's list is refused", async ({ page }) => {
  await openJoinPage(page);
  await page.getByRole("button", { name: /^college email/i }).click();
  await page.getByLabel(/college email address/i).fill(collegeAddress("gmail.com"));
  await page.getByRole("button", { name: /email me a code/i }).click();
  await expect(alert(page)).toBeVisible();
  await expect(page.getByLabel(/six digit code from your college email/i)).toHaveCount(0);
  await expect(page).toHaveURL(/\/c\/alpha\/join$/);
});

test("an expired invite code is explained on the screen", async ({ page }) => {
  const expired = await createInvite("UIOLD", { expiresInMs: -60_000 });
  await openJoinPage(page);
  await tryInviteCode(page, expired);
  await expect(alert(page)).toContainText(/has expired/i);
  await expect(page).toHaveURL(/\/c\/alpha\/join$/);
  await expectNoSidewaysScroll(page);
});

test("a used up invite code is explained on the screen", async ({ page }) => {
  const usedUp = await createInvite("UIFULL", { maxUses: 1, usedCount: 1 });
  await openJoinPage(page);
  await tryInviteCode(page, usedUp);
  await expect(alert(page)).toContainText(/used up/i);
  await expect(page).toHaveURL(/\/c\/alpha\/join$/);
  await expectNoSidewaysScroll(page);
});

test("an admin rejects a manual request with a reason, and the student reads it", async ({
  page,
  browser,
  contextOptions,
  baseURL,
}) => {
  const adminEmail = await memberOfAlpha(page, "JREJ");
  await setAlphaRole(adminEmail, "college_admin");

  const student = await secondStudent(browser, contextOptions, baseURL);
  const email = uniqueEmail();
  await signInThroughUi(student, email, "/c/alpha/join");
  await student.getByRole("button", { name: /ask to join/i }).click();
  await student.getByLabel(/enrolment number/i).fill("ENROLL-7373");
  await student.getByLabel(/^course/i).fill("B.Tech CSE");
  await student.getByLabel(/year you finish/i).fill(String(new Date().getFullYear() + 2));
  await student.getByRole("button", { name: /^ask to join$/i }).click();
  await expect(student).toHaveURL(/\/c\/alpha\/pending$/);

  await page.goto("/c/alpha/admin/verification");
  const card = page.locator("li", { hasText: email });
  await expect(card).toBeVisible();
  await expectNoSidewaysScroll(page);

  // Reject with no reason is refused on the screen, and the request keeps waiting.
  await card.getByRole("button", { name: "Reject" }).click();
  await card.getByRole("button", { name: "Reject" }).click();
  await expect(card.getByText(/write a reason of at least 5 characters/i)).toBeVisible();

  const reason = "Enrolment number does not match our records.";
  await card.getByLabel(/^reason/i).fill(reason);
  await card.getByRole("button", { name: "Reject" }).click();
  await expect(card.getByRole("button", { name: "Reject" })).toHaveCount(0);

  // The student sees that it was not accepted, and why.
  await student.getByRole("button", { name: /check now/i }).click();
  await expect(
    student.getByRole("heading", { name: /your request was not accepted/i }),
  ).toBeVisible();
  await expect(student.getByText(reason)).toBeVisible();
  await student.context().close();
});
