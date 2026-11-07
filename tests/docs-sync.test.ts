import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { errorCodes } from "../src/contracts/common";
import { notificationType } from "../src/contracts/engagement";
import { endpoints } from "../src/contracts/registry";

// Docs match code (R2-D9-1). These tests read the docs and the code and fail when one changes without the other.
// The endpoint list and the OpenAPI file are checked in src/contracts/registry.test.ts.
const root = join(__dirname, "..");
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("docs match code", () => {
  it("every setting in .env.example is explained in docs/DEV_SETUP.md", () => {
    const names = [...read(".env.example").matchAll(/^([A-Z][A-Z0-9_]+)=/gm)].map((m) => m[1]!);
    expect(names.length).toBeGreaterThan(5);
    const guide = read("docs/DEV_SETUP.md");
    expect(names.filter((name) => !guide.includes(name))).toEqual([]);
  });

  it("every error code is described in docs/API_CONTRACT.md", () => {
    const contract = read("docs/API_CONTRACT.md");
    expect(errorCodes.filter((code) => !contract.includes(code))).toEqual([]);
  });

  it("every notification type is described in docs/API_CONTRACT.md", () => {
    const contract = read("docs/API_CONTRACT.md");
    expect(notificationType.options.filter((type) => !contract.includes(type))).toEqual([]);
  });

  it("every table created by a migration is described in docs/DATABASE.md", () => {
    const migrations = readdirSync(join(root, "supabase", "migrations")).filter((n) =>
      n.endsWith(".sql"),
    );
    const tables = new Set<string>();
    for (const file of migrations) {
      const sql = read(`supabase/migrations/${file}`);
      for (const m of sql.matchAll(/^create table (?:if not exists )?public\.(\w+)/gim))
        tables.add(m[1]!);
    }
    const doc = read("docs/DATABASE.md");
    expect(tables.size).toBeGreaterThan(25);
    expect([...tables].filter((table) => !doc.includes(table)).sort()).toEqual([]);
  });

  it("every migration is named in docs/DATABASE.md", () => {
    const migrations = readdirSync(join(root, "supabase", "migrations")).filter((n) =>
      n.endsWith(".sql"),
    );
    const doc = read("docs/DATABASE.md");
    expect(migrations.filter((file) => !doc.includes(file.slice(0, 14))).sort()).toEqual([]);
  });

  it("every R2 build-session note is listed in the learning index", () => {
    const dir = "docs/learning/R2_backend/build-sessions";
    const index = read("docs/learning/R2_backend/INDEX.md");
    const notes = readdirSync(join(root, dir)).filter((n) => n.endsWith(".md"));
    expect(notes.filter((note) => !index.includes(note))).toEqual([]);
  });

  it("every endpoint in docs/API_CONTRACT.md is either built (registry) or listed under 'Not built' in docs/BACKEND_STATUS.md", () => {
    const contractIds = [
      ...new Set(
        [...read("docs/API_CONTRACT.md").matchAll(/^\| ([A-Z]+-\d+) \|/gm)].map((m) => m[1]!),
      ),
    ];
    const built = new Set(endpoints.map((x) => x.id));
    const status = read("docs/BACKEND_STATUS.md");
    const notBuiltSection = status.slice(
      status.indexOf("## 2. Not built"),
      status.indexOf("## 3."),
    );
    const builtSection = status.slice(
      status.indexOf("## 1. Built endpoints"),
      status.indexOf("## 2. Not built"),
    );
    expect(contractIds.filter((id) => !built.has(id) && !notBuiltSection.includes(id))).toEqual([]);
    expect([...built].filter((id) => !builtSection.includes(id))).toEqual([]);
    expect([...built].filter((id) => notBuiltSection.includes(id))).toEqual([]);
  });

  it("the new guides are in docs/INDEX.md", () => {
    const index = read("docs/INDEX.md");
    for (const file of [
      "PRODUCTION_SETUP.md",
      "PERMISSIONS.md",
      "BACKEND_STATUS.md",
      "CONNECTING_THE_API.md",
      "R2_MANUAL_STEPS.md",
    ]) {
      expect(index, file).toContain(file);
    }
  });

  it("every file a doc points to as docs/... exists (no dead links in the R2 guides)", () => {
    const guides = [
      "docs/CONNECTING_THE_API.md",
      "docs/PERMISSIONS.md",
      "docs/PRODUCTION_SETUP.md",
      "docs/R2_MANUAL_STEPS.md",
      "docs/BACKEND_STATUS.md",
    ];
    const missing: string[] = [];
    for (const guide of guides) {
      if (!existsSync(join(root, guide))) continue;
      for (const m of read(guide).matchAll(/`(docs\/[A-Za-z0-9_./-]+\.(?:md|json))`/g)) {
        if (!existsSync(join(root, m[1]!))) missing.push(`${guide} -> ${m[1]}`);
      }
    }
    expect(missing).toEqual([]);
  });
});
