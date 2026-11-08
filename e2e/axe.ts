import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Page } from "@playwright/test";

// Shared axe (accessibility checker) helper for the browser tests.
// It uses the axe-core package the repo already has.
const axeSource = readFileSync(join(process.cwd(), "node_modules/axe-core/axe.min.js"), "utf8");

export type Problem = {
  id: string;
  impact: string | null;
  help: string;
  nodes: string[];
};

export async function runAxe(page: Page): Promise<Problem[]> {
  await page
    .evaluate(async () => {
      const finite = document
        .getAnimations()
        .filter((a) => a.effect?.getComputedTiming?.().iterations !== Infinity);
      await Promise.all(finite.map((a) => a.finished));
    })
    .catch(() => {});
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

export function blockingProblems(problems: Problem[]): Problem[] {
  return problems.filter((p) => p.impact === "serious" || p.impact === "critical");
}
