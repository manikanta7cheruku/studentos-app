import { describe, expect, it } from "vitest";
import { collegeNameProblem } from "./college-name";
import { LAUNCH_COLLEGES, listedCollege, searchColleges } from "./launch-colleges";

describe("the colleges people can pick at launch", () => {
  it("lists the eleven colleges, each once", () => {
    expect(LAUNCH_COLLEGES).toHaveLength(11);
    expect(new Set(LAUNCH_COLLEGES.map((c) => c.name)).size).toBe(11);
    expect(new Set(LAUNCH_COLLEGES.map((c) => c.short)).size).toBe(11);
  });

  it("every listed name passes the same check as a typed name, so saving it is never refused", () => {
    for (const college of LAUNCH_COLLEGES) expect(collegeNameProblem(college.name)).toBeNull();
  });

  it("is sorted by name so a long list is easy to scan", () => {
    const names = LAUNCH_COLLEGES.map((c) => c.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });

  it("recognises a saved listed name, whatever the spacing or case, and not a typed one", () => {
    expect(listedCollege("cvr  college of engineering")?.short).toBe("CVR");
    expect(listedCollege("Keshav Memorial College of Engineering ")?.short).toBe("KMCE");
    expect(listedCollege("Alpha College")).toBeNull();
    expect(listedCollege("")).toBeNull();
  });

  it("searches by name or short name, and lists everything for empty text", () => {
    expect(searchColleges("")).toHaveLength(11);
    expect(searchColleges("  ")).toHaveLength(11);
    expect(searchColleges("guru").map((c) => c.short)).toEqual(["GNIT"]);
    expect(searchColleges("biet").map((c) => c.short)).toEqual(["BIET"]);
    expect(searchColleges("institute").length).toBeGreaterThan(5);
    expect(searchColleges("zzz")).toEqual([]);
  });
});
