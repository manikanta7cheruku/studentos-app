import {
  expect,
  test,
  type Browser,
  type BrowserContextOptions,
  type Page,
} from "@playwright/test";
import { admin, cleanUp, memberOfAlpha, uniqueIp } from "./helpers";

// How long a message stays after it is opened: the timer of a chat (1, 7 or 24 hours) that either person can change, and the
// default in Settings. Real backend, desktop and phone.

test.describe.configure({ mode: "serial" });

test.beforeEach(async ({ context }) => {
  await context.setExtraHTTPHeaders({ "x-forwarded-for": uniqueIp() });
});

test.afterAll(async () => {
  await cleanUp();
});

async function userId(email: string): Promise<string> {
  const { data } = await admin().auth.admin.listUsers({ perPage: 1000 });
  const found = data.users.find((user) => user.email === email);
  if (!found) throw new Error(`No user ${email}`);
  return found.id;
}

async function second(
  browser: Browser,
  contextOptions: BrowserContextOptions,
  baseURL: string | undefined,
  label: string,
): Promise<{ page: Page; email: string }> {
  const context = await browser.newContext({
    ...contextOptions,
    baseURL,
    extraHTTPHeaders: { "x-forwarded-for": uniqueIp() },
  });
  const page = await context.newPage();
  const email = await memberOfAlpha(page, label);
  return { page, email };
}

test("either person changes the timer of a chat, and the other sees it", async ({
  page,
  browser,
  contextOptions,
  baseURL,
}) => {
  const aliceEmail = await memberOfAlpha(page, "TMR1");
  const bob = await second(browser, contextOptions, baseURL, "TMR1B");
  const [aliceId, bobId] = await Promise.all([userId(aliceEmail), userId(bob.email)]);
  // People who follow each other can chat without a request.
  await admin()
    .from("follows")
    .insert([
      { follower_id: aliceId, followee_id: bobId },
      { follower_id: bobId, followee_id: aliceId },
    ]);

  await page.goto(`/c/alpha/messages/${bobId}`);
  const pill = page.getByRole("button", { name: /disappears 1 hour after it is seen/i });
  await expect(pill).toBeVisible();
  await page.getByRole("textbox", { name: "Message" }).fill("Hello Bob");
  await page.getByRole("button", { name: /^send$/i }).click();
  await expect(page.getByText("Hello Bob")).toBeVisible();

  // Alice picks 24 hours on the glass sheet; it saves on the tap and the sheet closes
  await pill.click();
  const sheet = page.getByRole("dialog");
  await expect(sheet.getByRole("heading", { name: /disappearing messages/i })).toBeVisible();
  await expect(sheet.getByRole("radio", { name: /^1 hour/i })).toBeChecked();
  await sheet.getByRole("radio", { name: /^24 hours/i }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: /disappears 24 hours after it is seen/i }),
  ).toBeVisible();

  // Bob sees the new timer, and who set it
  await bob.page.goto(`/c/alpha/messages/${aliceId}`);
  await expect(
    bob.page.getByRole("button", { name: /disappears 24 hours after it is seen/i }),
  ).toBeVisible();
  await expect(bob.page.getByText(/set this to 24 hours/i)).toBeVisible();
  // Bob can change it too, from the menu
  await bob.page.getByRole("button", { name: "More options" }).click();
  await bob.page.getByRole("menuitem", { name: /disappearing messages/i }).click();
  await bob.page
    .getByRole("dialog")
    .getByRole("radio", { name: /^7 hours/i })
    .click();
  await expect(
    bob.page.getByRole("button", { name: /disappears 7 hours after it is seen/i }),
  ).toBeVisible();
  await bob.page.context().close();
});

test("the default for new chats is set in Settings", async ({ page }) => {
  await memberOfAlpha(page, "TMR2");
  await page.goto("/c/alpha/me/settings");
  const tabs = page.getByRole("tablist", { name: /disappearing messages/i });
  await expect(tabs.getByRole("tab", { name: "1 hour" })).toHaveAttribute("aria-selected", "true");
  await tabs.getByRole("tab", { name: "7 hours" }).click();
  await expect(tabs.getByRole("tab", { name: "7 hours" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByText(/disappear 7 hours after they are seen/i).first()).toBeVisible();
  // It is kept: after a reload it is still 7 hours
  await page.reload();
  await expect(
    page
      .getByRole("tablist", { name: /disappearing messages/i })
      .getByRole("tab", { name: "7 hours" }),
  ).toHaveAttribute("aria-selected", "true");
});
