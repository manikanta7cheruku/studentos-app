import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (file: string): string => readFileSync(join(root, file), "utf8");

type PackageJson = {
  packageManager?: string;
  engines?: { node?: string };
  scripts?: Record<string, string>;
};
const pkg = JSON.parse(read("package.json")) as PackageJson;

describe("repository hygiene (R5 guardrails)", () => {
  it("defines every script the team relies on", () => {
    const required = [
      "dev",
      "build",
      "lint",
      "typecheck",
      "test",
      "format:check",
      "db:reset",
      "db:test",
      "verify",
    ];
    for (const name of required) {
      expect(pkg.scripts?.[name], `missing script: ${name}`).toBeTypeOf("string");
    }
  });

  it("pins the package manager and the Node version", () => {
    expect(pkg.packageManager).toMatch(/^pnpm@\d+\.\d+\.\d+/);
    expect(pkg.engines?.node).toBeTypeOf("string");
    expect(existsSync(join(root, ".nvmrc"))).toBe(true);
    expect(existsSync(join(root, "pnpm-lock.yaml"))).toBe(true);
  });

  it("keeps env files out of git but allows .env.example", () => {
    const lines = read(".gitignore")
      .split(/\r?\n/)
      .map((line) => line.trim());
    expect(lines).toContain(".env*");
    expect(lines).toContain("!.env.example");
  });

  it("ships .env.example with no secret values", () => {
    const secretName = /(KEY|SECRET|TOKEN|PASSWORD|DSN)/;
    const entries = read(".env.example")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line !== "" && !line.startsWith("#"));
    expect(entries.length).toBeGreaterThan(0);
    for (const entry of entries) {
      const index = entry.indexOf("=");
      expect(index, `not KEY=VALUE: ${entry}`).toBeGreaterThan(0);
      const key = entry.slice(0, index);
      const value = entry.slice(index + 1);
      expect(key).toMatch(/^[A-Z][A-Z0-9_]*$/);
      if (secretName.test(key)) {
        expect(value, `${key} must be empty in .env.example`).toBe("");
      }
    }
  });
});
