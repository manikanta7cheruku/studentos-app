import { describe, expect, it } from "vitest";
import { networkProgress, openers } from "../network-tiers";

describe("networkProgress", () => {
  it("starts with meet 3 people", () => {
    const p = networkProgress(0);
    expect(p.tier).toBeNull();
    expect(p.next?.at).toBe(3);
    expect(p.left).toBe(3);
  });
  it("moves up at 3, 6 and 10", () => {
    expect(networkProgress(3).tier?.at).toBe(3);
    expect(networkProgress(3).next?.at).toBe(6);
    expect(networkProgress(7).tier?.at).toBe(6);
    expect(networkProgress(10).next?.at).toBe(20);
  });
  it("tops out at 100", () => {
    const p = networkProgress(140);
    expect(p.tier?.at).toBe(100);
    expect(p.next).toBeNull();
    expect(p.fraction).toBe(1);
  });
});

describe("openers", () => {
  it("uses a shared interest first", () => {
    expect(openers("Asha", ["Cricket"])[0]).toContain("Cricket");
    expect(openers("Asha", [])).toHaveLength(2);
  });
});
