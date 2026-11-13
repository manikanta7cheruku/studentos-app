import { describe, expect, it } from "vitest";
import { badgesFor } from "../badges";

const none = { buzz: 0, replies: 0, plans: 0, events: 0, upvotes: 0, debates: 0, invited: 0 };

describe("badges", () => {
  it("gives nothing for no contributions", () => {
    expect(badgesFor(none)).toEqual([]);
  });

  it("gives one debate badge, the highest earned", () => {
    expect(badgesFor({ ...none, debates: 1 }).map((b) => b.key)).toEqual(["debater"]);
    expect(badgesFor({ ...none, debates: 5 }).map((b) => b.key)).toEqual(["regular"]);
    expect(badgesFor({ ...none, debates: 20 }).map((b) => b.key)).toEqual(["champion"]);
  });

  it("rewards giving, not only posting a lot", () => {
    expect(badgesFor({ ...none, buzz: 500 })).toEqual([]);
    const keys = badgesFor({
      ...none,
      upvotes: 20,
      plans: 3,
      events: 1,
      invited: 3,
      replies: 10,
    }).map((b) => b.key);
    expect(keys).toEqual(["helpful", "organiser", "host", "connector", "voice"]);
  });
});
