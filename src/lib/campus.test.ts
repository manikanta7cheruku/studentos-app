import { describe, expect, it } from "vitest";
import { campusPeople, namesLine, sameCollege, type CampusPerson } from "./campus";

const person = (id: string, name: string, extra: Partial<CampusPerson> = {}): CampusPerson => ({
  user_id: id,
  display_name: name,
  avatar_url: null,
  college_name: "Sri Indu Institute of Engineering and Technology",
  interests: [],
  tech_interests: [],
  ...extra,
});

describe("colleges are the same when only capitals and spaces differ", () => {
  it("matches", () => {
    expect(sameCollege("CVR College of Engineering", "cvr  college of engineering ")).toBe(true);
    expect(sameCollege("CVR College of Engineering", "Guru Nanak Institute of Technology")).toBe(
      false,
    );
    expect(sameCollege(null, "CVR College of Engineering")).toBe(false);
    expect(sameCollege("", "")).toBe(false);
  });
});

describe("the people of a college on a profile", () => {
  const college = "sri indu institute of engineering and technology";
  const people = [
    person("1", "Asha Rao"),
    person("2", "Ravi Kumar", { interests: ["Football", "Music"] }),
    person("3", "Meena S", { interests: ["Music"], branch: "CSE" }),
    person("4", "Kiran P", { college_name: "CVR College of Engineering" }),
    person("5", "Owner Person"),
    person("6", "Viewer Person"),
    person("7", "Zoya A", { branch: "CSE", grad_year: 2027 }),
  ];

  it("leaves out the owner of the profile and the viewer, and other colleges", () => {
    const result = campusPeople({ people, college, excludeIds: ["5", "6"] });
    expect(result.count).toBe(4);
    expect(result.list.map((p) => p.user_id)).not.toContain("4");
    expect(result.list.map((p) => p.user_id)).not.toContain("5");
  });

  it("puts the people with most in common first, then the same branch and year, then by name", () => {
    const result = campusPeople({
      people,
      college,
      excludeIds: ["5", "6"],
      viewerInterests: ["football", "music"],
      viewerBranch: "cse",
      viewerYear: 2027,
    });
    // Ravi shares two interests, Meena one, then Zoya (same branch and year), then Asha.
    expect(result.list.map((p) => p.display_name)).toEqual([
      "Ravi Kumar",
      "Meena S",
      "Zoya A",
      "Asha Rao",
    ]);
    expect(result.names).toEqual(["Ravi", "Meena"]);
    expect(result.more).toBe(2);
  });

  it("keeps a stable order when nothing separates people", () => {
    const first = campusPeople({ people, college, excludeIds: [] }).list.map((p) => p.user_id);
    const second = campusPeople({
      people: [...people].reverse(),
      college,
      excludeIds: [],
    }).list.map((p) => p.user_id);
    expect(second).toEqual(first);
  });

  it("says nobody when there is nobody", () => {
    expect(campusPeople({ people: [], college, excludeIds: [] })).toEqual({
      count: 0,
      list: [],
      names: [],
      more: 0,
    });
  });
});

describe("the line under the count", () => {
  it("reads naturally", () => {
    expect(namesLine(["Asha", "Ravi"], 16)).toBe("Asha, Ravi and 16 more");
    expect(namesLine(["Asha", "Ravi"], 0)).toBe("Asha and Ravi");
    expect(namesLine(["Asha"], 0)).toBe("Asha");
    expect(namesLine([], 0)).toBe("");
  });
});
