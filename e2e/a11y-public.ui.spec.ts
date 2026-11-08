import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";

// Runs axe (the accessibility checker) on every public page in a real browser.
// It uses the axe-core package the repo already has, so no new dependency is added.
// Serious and critical problems fail the test. Other problems are printed and attached to the report.

const axeSource = readFileSync(join(process.cwd(), "node_modules/axe-core/axe.min.js"), "utf8");

// The page security policy would block the injected axe script, so we skip it for this test only.
test.use({ bypassCSP: true });

const publicPages = [
  "/",
  "/signin",
  "/find",
  "/colleges",
  "/contact",
  "/privacy",
  "/safety",
  "/terms",
  "/dev/components",
];

type Problem = {
  id: string;
  impact: string | null;
  help: string;
  nodes: string[];
};

async function runAxe(page: Page): Promise<Problem[]> {
  await page.addScriptTag({ content: axeSource });
  return page.evaluate(async () => {
    type AxeNode = { target: unknown[]; html: string };
    type AxeViolation = { id: string; impact: string | null; help: string; nodes: AxeNode[] };
    const axe = (
      window as unknown as {
        axe: { run: (c: Document, o: object) => Promise<{ violations: AxeViolation[] }> };
      }
    ).axe;
    const results = await axe.run(document, {
      runOnly: {
        type: "tag",
        values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"],
      },
    });
    return results.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      help: v.help,
      nodes: v.nodes.map((n) => `${n.target.join(" ")}  =>  ${n.html.slice(0, 120)}`),
    }));
  });
}

for (const path of publicPages) {
  test(`axe: ${path} has no serious or critical problems`, async ({ page }, testInfo) => {
    await page.goto(path);
    await expect(page.locator("h1").first()).toBeVisible();

    const problems = await runAxe(page);
    await testInfo.attach(`axe-${path.replace(/\W+/g, "_")}.json`, {
      body: JSON.stringify(problems, null, 2),
      contentType: "application/json",
    });

    for (const p of problems) {
      console.log(`[${path}] ${p.impact} | ${p.id} | ${p.help} | ${p.nodes.length} element(s)`);
    }

    const blocking = problems.filter((p) => p.impact === "serious" || p.impact === "critical");
    expect(
      blocking,
      blocking.map((p) => `${p.impact} ${p.id}: ${p.nodes.join("\n")}`).join("\n"),
    ).toEqual([]);
  });
}
