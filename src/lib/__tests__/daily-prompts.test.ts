import { describe, expect, it } from "vitest";
import { DAILY_PROMPTS, promptByKey, promptOfTheDay } from "../daily-prompts";

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
