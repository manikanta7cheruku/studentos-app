import { describe, expect, it } from "vitest";
import { openers } from "../network-openers";

describe("openers", () => {
  it("uses a shared interest first", () => {
    expect(openers("Asha", ["Cricket"])[0]).toContain("Cricket");
    expect(openers("Asha", [])).toHaveLength(2);
  });
});
