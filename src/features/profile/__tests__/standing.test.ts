import { describe, expect, it } from "vitest";
import { badgesOf, standingOf, type Counts } from "../standing";

const none: Counts = {
  buzz: 0,
  replies: 0,
  plans: 0,
  events: 0,
  upvotes: 0,
  debates: 0,
  invited: 0,
  crowd_debates: 0,
  filled_plans: 0,
  big_events: 0,
  member_days: 0,
};

describe("standing", () => {
  it("starts as a newcomer", () => {
    const s = standingOf(none);
    expect(s.level.name).toBe("Newcomer");
    expect(s.score).toBe(0);
    expect(s.next?.name).toBe("Contributor");
  });

  it("does not reward posting a lot: a hundred buzz alone count for nothing", () => {
    expect(standingOf({ ...none, buzz: 100, debates: 100 }).score).toBe(0);
  });

  it("stops counting replies after their cap", () => {
    const s = standingOf({ ...none, replies: 5000 });
    expect(s.score).toBe(50);
  });

  it("counts what other people gave", () => {
    const s = standingOf({ ...none, upvotes: 20, crowd_debates: 1 });
    // 20 upvotes * 2 + a crowd debate * 25
    expect(s.score).toBe(65);
    expect(s.level.name).toBe("Contributor");
  });

  it("needs time as a member for the higher levels", () => {
    const rich = { ...none, upvotes: 300 };
    expect(standingOf({ ...rich, member_days: 3 }).level.name).toBe("Contributor");
    expect(standingOf({ ...rich, member_days: 14 }).level.name).toBe("Regular");
    expect(standingOf({ ...rich, member_days: 31 }).level.name).toBe("Trusted");
    const wait = standingOf({ ...rich, member_days: 3 });
    expect(wait.daysToNext).toBeGreaterThan(0);
  });

  it("tops out at Pillar", () => {
    const s = standingOf({ ...none, upvotes: 2000, member_days: 400 });
    expect(s.level.name).toBe("Pillar");
    expect(s.next).toBeNull();
    expect(s.progress).toBe(1);
  });
});

describe("badges", () => {
  it("are all locked at the start, each with what it takes", () => {
    const badges = badgesOf(none);
    expect(badges.every((b) => !b.earned)).toBe(true);
    expect(badges.map((b) => b.key)).toContain("voice");
  });

  it("are earned only at the real threshold", () => {
    const get = (c: Partial<Counts>, key: string) =>
      badgesOf({ ...none, ...c }).find((b) => b.key === key)!;
    expect(get({ upvotes: 99 }, "voice").earned).toBe(false);
    expect(get({ upvotes: 100 }, "voice").earned).toBe(true);
    expect(get({ crowd_debates: 3 }, "crowd").earned).toBe(true);
    expect(get({ upvotes: 60, member_days: 30 }, "long-haul").earned).toBe(false);
    expect(get({ upvotes: 60, member_days: 90 }, "long-haul").earned).toBe(true);
  });
});
