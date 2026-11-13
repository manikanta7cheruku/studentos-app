import { describe, expect, it } from "vitest";
import { profileChanges } from "../edit-screen";
import { skillsPayload } from "../skills-screen";
import { levelLabel } from "../skill-level";

const saved = {
  user_id: "11111111-1111-4111-8111-111111111111",
  display_name: "Riya Sharma",
  handle: "riya_alpha",
  headline: "Hello",
  bio: null,
  avatar_url: null,
  interests: ["web", "design"],
  tech_interests: [],
  excited_by: null,
  career_goal: null,
  visibility: "college" as const,
  portfolio_public: false,
  sex: null,
  sex_public: false,
  age_public: false,
  college_name: null,
  branch: null,
  grad_year: null,
  place: null,
  followers: 0,
  following: 0,
  contributions: null,
  birth_year: null,
  phone: null,
  phone_visibility: "hidden" as const,
  onboarded: true,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

const same = {
  display_name: "Riya Sharma",
  handle: "riya_alpha",
  headline: "Hello",
  bio: "",
  career_goal: "",
  interests: ["web", "design"],
};

describe("profileChanges", () => {
  it("sends nothing when nothing changed", () => {
    expect(profileChanges(saved, same)).toEqual({});
  });

  it("sends only the fields that changed", () => {
    expect(profileChanges(saved, { ...same, headline: "New line" })).toEqual({
      headline: "New line",
    });
  });

  it("turns cleared text into null, and trims", () => {
    expect(profileChanges(saved, { ...same, handle: "  ", display_name: "  Riya S  " })).toEqual({
      handle: null,
      display_name: "Riya S",
    });
  });

  it("sends the interests when their order or content changes", () => {
    expect(profileChanges(saved, { ...same, interests: ["design", "web"] })).toEqual({
      interests: ["design", "web"],
    });
  });
});

describe("skillsPayload", () => {
  it("leaves out empty links and keeps the level", () => {
    expect(
      skillsPayload([
        { skill_id: "a", name: "Python", level: 4, evidence_url: "" },
        { skill_id: "b", name: "Figma", level: 2, evidence_url: " https://x.dev/y " },
      ]),
    ).toEqual([
      { skill_id: "a", level: 4 },
      { skill_id: "b", level: 2, evidence_url: "https://x.dev/y" },
    ]);
  });
});

describe("levelLabel", () => {
  it("names levels 1 to 5 and stays inside that range", () => {
    expect(levelLabel(1)).toBe("Just starting");
    expect(levelLabel(5)).toBe("Expert");
    expect(levelLabel(9)).toBe("Expert");
    expect(levelLabel(0)).toBe("Just starting");
  });
});
