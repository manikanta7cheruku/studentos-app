import { test, expect } from "@playwright/test";

// R4 D6: a very long title must never make the page scroll sideways.
const routes = [
  "/c/alpha/collaborate",
  "/c/alpha/admin",
  "/c/alpha/admin/audit",
  "/c/alpha/admin/invites",
  "/c/alpha/admin/members",
  "/c/alpha/admin/settings",
  "/c/alpha/admin/verification",
  "/admin/reports",
  "/dev/components",
];
const widths = [360, 768, 1280];
const LONG = "A".repeat(60);

for (const route of routes) {
  for (const width of widths) {
    test(`long title keeps ${route} inside the screen at ${width}px`, async ({
      page,
    }, testInfo) => {
      test.skip(testInfo.project.name === "phone", "this test sets its own width");
      await page.setViewportSize({ width, height: 900 });
      await page.goto(route, { waitUntil: "networkidle" });
      await page.evaluate((text) => {
        document.querySelectorAll("h1, h2").forEach((el) => {
          el.textContent = text;
        });
      }, LONG);
      const { sw, cw } = await page.evaluate(() => ({
        sw: document.documentElement.scrollWidth,
        cw: document.documentElement.clientWidth,
      }));
      expect(sw, `page is ${sw}px wide on a ${cw}px screen`).toBeLessThanOrEqual(cw);
    });
  }
}
