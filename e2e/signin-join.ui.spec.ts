import { expect, test, type Page } from "@playwright/test";
import { cleanUp, codeFor, createInvite, signInThroughUi, uniqueEmail, uniqueIp } from "./helpers";

// Browser journeys for R3 Day 2 (sign in and join), in a desktop and a phone browser, against the real backend:
//   sign in with an email code, land where the person belongs, join a college with an invite code, wait for approval.
// Every page is also checked for sideways scrolling (a rule from docs/DESIGN_SYSTEM.md).

test.describe.configure({ mode: "serial" });

test.beforeEach(async ({ context }) => {
  // Every test is its own "visitor" for the rate limits.
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

const signIn = signInThroughUi;

test("the sign in page asks for an email and does not scroll sideways", async ({ page }) => {
  await page.goto("/signin");
  await expect(page.getByRole("heading", { name: /sign in to your college/i })).toBeVisible();
  await expectNoSidewaysScroll(page);
});

test("a wrong email is explained, not sent", async ({ page }) => {
  await page.goto("/signin");
  await page.getByLabel(/email address/i).fill("not-an-email");
  await page.getByRole("button", { name: /email me a code/i }).click();
  await expect(page.getByText(/enter your email address/i)).toBeVisible();
});

test("a wrong code shows a plain message and lets the person try again", async ({ page }) => {
  const email = uniqueEmail();
  await page.goto("/signin");
  await page.getByLabel(/email address/i).fill(email);
  await page.getByRole("button", { name: /email me a code/i }).click();
  await expect(page.getByRole("heading", { name: /enter the code/i })).toBeVisible();
  await page.getByLabel(/six digit code from your email/i).fill("000000");
  await expect(page.locator("[data-slot=banner][role=alert]")).toContainText(
    /not right|expired|too many/i,
  );
});

test("signing in with no college leads to the find college page", async ({ page }) => {
  const email = uniqueEmail();
  await signIn(page, email);
  await expect(page).toHaveURL(/\/find$/);
  await expect(page.getByRole("heading", { name: /which college/i })).toBeVisible();
  await expectNoSidewaysScroll(page);
});

test("a signed out visitor of a college screen signs in and comes back", async ({ page }) => {
  const email = uniqueEmail();
  await page.goto("/c/alpha/campus");
  await expect(page).toHaveURL(/\/signin\?next=%2Fc%2Falpha%2Fcampus/);
  await page.getByLabel(/email address/i).fill(email);
  await page.getByRole("button", { name: /email me a code/i }).click();
  await page.getByLabel(/six digit code from your email/i).fill(await codeFor(email));
  // Not a member yet, so the gate sends the person on to the join page.
  await expect(page).toHaveURL(/\/c\/alpha\/join$/);
  await expect(page.getByRole("heading", { name: /join alpha college/i })).toBeVisible();
  await expectNoSidewaysScroll(page);
});

test("joining with a good invite code opens the campus", async ({ page }) => {
  const email = uniqueEmail();
  const invite = await createInvite("UIGOOD");
  await signIn(page, email, "/c/alpha/join");
  await expect(page).toHaveURL(/\/c\/alpha\/join$/);
  await page
    .getByLabel(/invite code/i)
    .last()
    .fill(invite);
  await page.getByRole("button", { name: /join with this code/i }).click();
  await expect(page).toHaveURL(/\/c\/alpha\/campus$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expectNoSidewaysScroll(page);
});

test("a wrong invite code is explained", async ({ page }) => {
  const email = uniqueEmail();
  await signIn(page, email, "/c/alpha/join");
  await expect(page).toHaveURL(/\/c\/alpha\/join$/);
  await page
    .getByLabel(/invite code/i)
    .last()
    .fill("NOPE-NOPE");
  await page.getByRole("button", { name: /join with this code/i }).click();
  await expect(page.locator("[data-slot=banner][role=alert]")).toContainText(/invite code/i);
});

test("an invite that needs approval leads to the waiting page", async ({ page }) => {
  const email = uniqueEmail();
  const invite = await createInvite("UIPEND", { grants: "pending" });
  await signIn(page, email, "/c/alpha/join");
  await page
    .getByLabel(/invite code/i)
    .last()
    .fill(invite);
  await page.getByRole("button", { name: /join with this code/i }).click();
  await expect(page).toHaveURL(/\/c\/alpha\/pending$/);
  await expect(page.getByRole("heading", { name: /waiting for your college/i })).toBeVisible();
  await expectNoSidewaysScroll(page);
});

test("an unknown college says so", async ({ page }) => {
  await page.goto("/c/no-such-college");
  await expect(page.getByRole("heading", { name: /could not find that college/i })).toBeVisible();
});

test("a student with no college joins Global and lands in Collaborate", async ({ page }) => {
  const email = uniqueEmail();
  await signIn(page, email);
  await expect(page).toHaveURL(/\/find$/);
  await page.getByRole("link", { name: /join global/i }).click();
  await expect(page).toHaveURL(/\/c\/global\/join$/);
  await expect(page.getByRole("heading", { name: /join studentos global/i })).toBeVisible();
  await expectNoSidewaysScroll(page);
  await page.getByRole("button", { name: /join global/i }).click();
  await expect(page).toHaveURL(/\/c\/global\/collaborate$/);
  await expect(page.getByRole("heading", { level: 1 }).filter({ visible: true })).toBeVisible();
  await expectNoSidewaysScroll(page);
});

test("a college join page offers Global for students whose college has no email", async ({
  page,
}) => {
  await signIn(page, uniqueEmail(), "/c/alpha/join");
  await expect(page).toHaveURL(/\/c\/alpha\/join$/);
  await page.getByRole("link", { name: /join global instead/i }).click();
  await expect(page).toHaveURL(/\/c\/global\/join$/);
});

test("Continue with Google stays hidden until Google sign in is switched on", async ({ page }) => {
  await page.goto("/signin");
  await expect(page.getByRole("link", { name: /continue with google/i })).toHaveCount(0);
  await page.goto("/signin?error=google_cancelled");
  await expect(page.getByText(/cancelled the google sign in/i)).toBeVisible();
});

test("/start sends a signed out visitor to sign in", async ({ page }) => {
  await page.goto("/start");
  await expect(page).toHaveURL(/\/signin$/);
});

test("/start sends a signed in person with no college to find a college", async ({ page }) => {
  await signIn(page, uniqueEmail());
  await expect(page).toHaveURL(/\/find$/);
  await page.goto("/start");
  await expect(page).toHaveURL(/\/find$/);
});
