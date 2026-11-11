import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const uiDir = join(process.cwd(), "src/components/ui");
const files = readdirSync(uiDir).filter((name) => name.endsWith(".tsx"));

// Design system v2 (decision D-29): one dark world and one brand gradient, so glass, gradients, white at low opacity and
// rounded corners are part of the look. What still must not appear: tiny text, a second theme, and a theme library.
const forbidden: { name: string; pattern: RegExp }[] = [
  { name: "text smaller than 14px (text-xs or text-sm)", pattern: /\btext-(xs|sm)\b/ },
  { name: "dark: classes (there is one theme)", pattern: /\bdark:/ },
  { name: "next-themes (not used)", pattern: /next-themes/ },
];

describe("design rules for src/components/ui", () => {
  it("finds the component files", () => {
    expect(files.length).toBeGreaterThan(5);
  });

  for (const { name, pattern } of forbidden) {
    it(`has no ${name}`, () => {
      const hits = files.filter((file) => pattern.test(readFileSync(join(uiDir, file), "utf8")));
      expect(hits, `found in: ${hits.join(", ")}`).toEqual([]);
    });
  }
});
