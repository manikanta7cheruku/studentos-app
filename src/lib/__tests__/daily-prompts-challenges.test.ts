import { describe, expect, it } from "vitest";
import { DAILY_PROMPTS, promptByKey, promptOfTheDay } from "../daily-prompts";
import { CHALLENGES, challengeFor, weekEndsAt, weekKey } from "../challenges";

describe("the question of the day", () => {
  it("is the same all day and changes the next day", () => {
    const morning = promptOfTheDay(new Date("2026-11-13T02:00:00"));
    const night = promptOfTheDay(new Date("2026-11-13T23:30:00"));
    const next = promptOfTheDay(new Date("2026-11-14T02:00:00"));
    expect(morning.key).toBe(night.key);
    expect(next.key).not.toBe(morning.key);
  });

  it("can be found again by its key, and an odd key finds nothing", () => {
    const { key, text } = promptOfTheDay(new Date("2026-11-13T12:00:00"));
    expect(promptByKey(key)).toBe(text);
    expect(promptByKey("q9999")).toBeNull();
    expect(promptByKey("hello")).toBeNull();
    expect(promptByKey(null)).toBeNull();
    expect(DAILY_PROMPTS.length).toBeGreaterThan(20);
  });
});

describe("the weekly challenge", () => {
  it("names the ISO week", () => {
    expect(weekKey(new Date("2026-11-13T12:00:00Z"))).toBe("2026-W46");
    // The first days of January can belong to the last week of the year before.
    expect(weekKey(new Date("2027-01-01T12:00:00Z"))).toBe("2026-W53");
    expect(weekKey(new Date("2026-01-05T12:00:00Z"))).toBe("2026-W02");
  });

  it("ends on the next Monday, UTC", () => {
    expect(weekEndsAt(new Date("2026-11-13T12:00:00Z"))).toBe("2026-11-16T00:00:00.000Z");
    expect(weekEndsAt(new Date("2026-11-15T23:59:00Z"))).toBe("2026-11-16T00:00:00.000Z");
    expect(weekEndsAt(new Date("2026-11-16T00:00:00Z"))).toBe("2026-11-23T00:00:00.000Z");
  });

  it("gives everybody the same challenge in a week, and a new one the week after", () => {
    expect(challengeFor("2026-W46")).toEqual(challengeFor("2026-W46"));
    expect(challengeFor("2026-W46").title).not.toBe(challengeFor("2026-W47").title);
    expect(CHALLENGES.length).toBeGreaterThanOrEqual(10);
  });
});
