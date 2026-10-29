import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const uiDir = join(process.cwd(), "src/components/ui");
const files = readdirSync(uiDir).filter((name) => name.endsWith(".tsx"));

const forbidden: { name: string; pattern: RegExp }[] = [
  { name: "text smaller than 16px (text-xs or text-sm)", pattern: /\btext-(xs|sm)\b/ },
  { name: "dark: classes (we have no dark mode)", pattern: /\bdark:/ },
  { name: "glass blur (backdrop-blur)", pattern: /backdrop-blur/ },
  { name: "gradients", pattern: /\bbg-(gradient|linear|radial|conic)-/ },
  { name: "raw black or white (use tokens)", pattern: /\b(bg|text|border)-(black|white)\b/ },
  {
    name: "rounded-xl or bigger (use rounded-sheet)",
    pattern: /\brounded(-[a-z]+)?-(xl|2xl|3xl|4xl)\b/,
  },
  { name: "raw hex colors (use tokens)", pattern: /#[0-9a-fA-F]{3,8}\b/ },
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
