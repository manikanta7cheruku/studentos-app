import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  checkPackages,
  exceptionProblems,
  expressionAllowed,
  flattenPnpm,
  nameMatches,
  toAllowedSet,
} from "../scripts/licence-lib.mjs";

const read = (file: string) => readFileSync(join(process.cwd(), file), "utf8");
const allowList: string[] = JSON.parse(read("licenses.allow.json")).allowed;
const allowed = toAllowedSet(allowList);
const ok = (expression: string) => expressionAllowed(expression, allowed);
const pkg = (name: string, license: string) => ({ name, version: "1.0.0", license });

describe("licence expressions", () => {
  it("allows the licences on the list, in any letter case", () => {
    for (const id of ["MIT", "ISC", "Apache-2.0", "BSD-3-Clause", "0BSD", "mit"])
      expect(ok(id)).toBe(true);
  });

  it("refuses licences that LICENSING.md forbids, and anything we cannot read", () => {
    for (const id of [
      "GPL-3.0-only",
      "AGPL-3.0-only",
      "LGPL-3.0-or-later",
      "CC-BY-NC-4.0",
      "BUSL-1.1",
      "UNLICENSED",
      "Unknown",
      "SEE LICENSE IN LICENSE.md",
      "",
    ]) {
      expect(ok(id), id).toBe(false);
    }
  });

  it("OR needs one allowed side", () => {
    expect(ok("(MIT OR CC0-1.0)")).toBe(true);
    expect(ok("MIT OR GPL-3.0-only")).toBe(true);
    expect(ok("GPL-3.0-only OR AGPL-3.0-only")).toBe(false);
  });

  it("AND needs both sides allowed", () => {
    expect(ok("MIT AND ISC")).toBe(true);
    expect(ok("Apache-2.0 AND LGPL-3.0-or-later")).toBe(false);
  });

  it("AND binds tighter than OR, and brackets change that", () => {
    expect(ok("MIT OR GPL-3.0-only AND AGPL-3.0-only")).toBe(true);
    expect(ok("GPL-3.0-only AND MIT OR AGPL-3.0-only")).toBe(false);
    expect(ok("(MIT OR GPL-3.0-only) AND AGPL-3.0-only")).toBe(false);
  });

  it("refuses broken expressions instead of guessing", () => {
    for (const text of ["(MIT", "MIT OR", "MIT MIT", ")", "AND MIT"])
      expect(ok(text), text).toBe(false);
  });

  it("WITH keeps the base licence, so a forbidden base stays forbidden", () => {
    expect(ok("GPL-2.0-only WITH Classpath-exception-2.0")).toBe(false);
    expect(ok("Apache-2.0 WITH LLVM-exception")).toBe(true);
  });
});

describe("package check", () => {
  const approved = {
    name: "left-pad",
    license: "WTFPL",
    reason: "test",
    status: "approved",
    approvedBy: "R2",
    approvedOn: "2026-11-15",
  };
  const pending = { ...approved, status: "pending", approvedBy: null, approvedOn: null };

  it("fails a forbidden licence with no exception", () => {
    const result = checkPackages([pkg("evil", "GPL-3.0-only"), pkg("fine", "MIT")], allowList, []);
    expect(result.failed.map((p: { name: string }) => p.name)).toEqual(["evil"]);
  });

  it("an approved exception passes, a pending one is reported but does not approve", () => {
    const withApproved = checkPackages([pkg("left-pad", "WTFPL")], allowList, [approved]);
    expect(withApproved.failed).toHaveLength(0);
    expect(withApproved.approved).toHaveLength(1);
    const withPending = checkPackages([pkg("left-pad", "WTFPL")], allowList, [pending]);
    expect(withPending.failed).toHaveLength(0);
    expect(withPending.pending).toHaveLength(1);
  });

  it("an exception needs an approver and a date to count as approved", () => {
    const noApprover = { ...approved, approvedBy: null };
    const result = checkPackages([pkg("left-pad", "WTFPL")], allowList, [noApprover]);
    expect(result.failed).toHaveLength(1);
    expect(exceptionProblems([noApprover]).length).toBeGreaterThan(0);
    expect(exceptionProblems([{ ...approved, approvedOn: "yesterday" }]).length).toBeGreaterThan(0);
  });

  it("an exception stops applying when the package changes its licence", () => {
    const result = checkPackages([pkg("left-pad", "GPL-3.0-only")], allowList, [approved]);
    expect(result.failed).toHaveLength(1);
  });

  it("matches names with a trailing star only as a prefix", () => {
    expect(nameMatches("@img/sharp-libvips-*", "@img/sharp-libvips-linux-x64")).toBe(true);
    expect(nameMatches("@img/sharp-libvips-*", "@img/sharp-linux-x64")).toBe(false);
    expect(nameMatches("left-pad", "left-pad-2")).toBe(false);
    expect(nameMatches("", "anything")).toBe(false);
  });

  it("reads the pnpm output, one row per version", () => {
    const rows = flattenPnpm({
      MIT: [{ name: "a", versions: ["1.0.0", "2.0.0"] }],
      ISC: [{ name: "b", versions: ["3.0.0"] }],
    });
    expect(rows).toHaveLength(3);
    expect(rows[0]).toEqual({ name: "a", version: "1.0.0", license: "MIT" });
  });
});

describe("the committed files", () => {
  it("every allowed licence is written in docs/LICENSING.md", () => {
    const doc = read("docs/LICENSING.md");
    for (const id of allowList) expect(doc, id).toContain(id);
  });

  it("licenses.exceptions.json has no problems and every entry has a reason", () => {
    const exceptions = JSON.parse(read("licenses.exceptions.json")).exceptions;
    expect(exceptionProblems(exceptions)).toEqual([]);
  });
});
