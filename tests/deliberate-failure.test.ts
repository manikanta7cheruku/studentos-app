import { expect, it } from "vitest";

it("fails on purpose to prove CI blocks a bad pull request", () => {
  expect(1).toBe(2);
});
