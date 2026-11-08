import { describe, expect, it } from "vitest";
import { collegeCodeFrom } from "../find-college-screen";
import { looksLikeEmail, safeNext } from "../safe-next";

describe("safeNext", () => {
  it("keeps addresses inside the app", () => {
    expect(safeNext("/c/alpha/campus")).toBe("/c/alpha/campus");
    expect(safeNext("/signin?x=1")).toBe("/signin?x=1");
  });

  it("drops anything that could leave the app", () => {
    expect(safeNext("https://evil.example")).toBeNull();
    expect(safeNext("//evil.example")).toBeNull();
    expect(safeNext("/\\evil.example")).toBeNull();
    expect(safeNext("javascript:alert(1)")).toBeNull();
    expect(safeNext("/ok\nbad")).toBeNull();
    expect(safeNext("")).toBeNull();
    expect(safeNext(null)).toBeNull();
  });
});

describe("looksLikeEmail", () => {
  it("accepts normal addresses and rejects obvious mistakes", () => {
    expect(looksLikeEmail("name@college.edu")).toBe(true);
    expect(looksLikeEmail("  name@college.edu ")).toBe(true);
    expect(looksLikeEmail("name@college")).toBe(false);
    expect(looksLikeEmail("name college@x.edu")).toBe(false);
    expect(looksLikeEmail("")).toBe(false);
  });
});

describe("collegeCodeFrom", () => {
  it("reads a code or a link", () => {
    expect(collegeCodeFrom("alpha")).toBe("alpha");
    expect(collegeCodeFrom("  Alpha-College ")).toBe("alpha-college");
    expect(collegeCodeFrom("https://studentos.app/c/alpha/campus")).toBe("alpha");
  });

  it("refuses text that cannot be a college code", () => {
    expect(collegeCodeFrom("")).toBeNull();
    expect(collegeCodeFrom("a")).toBeNull();
    expect(collegeCodeFrom("not a code")).toBeNull();
    expect(collegeCodeFrom("-bad-")).toBeNull();
  });
});
