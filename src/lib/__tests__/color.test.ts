import { describe, expect, it } from "vitest";
import { DEFAULT_ACCENT, accentVars, contrastOnWhite, isHexColor, safeAccent } from "@/lib/color";

describe("college accent colour", () => {
  it("accepts only six digit hex colours", () => {
    expect(isHexColor("#1D4ED8")).toBe(true);
    expect(isHexColor("1D4ED8")).toBe(false);
    expect(isHexColor("#fff")).toBe(false);
    expect(isHexColor(null)).toBe(false);
  });

  it("measures contrast against white", () => {
    expect(contrastOnWhite("#000000")).toBeGreaterThan(20);
    expect(contrastOnWhite("#FFFFFF")).toBeLessThan(1.1);
  });

  it("keeps a readable college colour", () => {
    expect(safeAccent("#1D4ED8")).toBe("#1D4ED8");
  });

  it("falls back to the StudentOS blue for a colour that is too light or invalid", () => {
    expect(safeAccent("#FFEE00")).toBe(DEFAULT_ACCENT);
    expect(safeAccent("red")).toBe(DEFAULT_ACCENT);
    expect(safeAccent(undefined)).toBe(DEFAULT_ACCENT);
  });

  it("gives CSS variables for the accent", () => {
    const vars = accentVars("#1D4ED8");
    expect(Object.keys(vars).length).toBeGreaterThan(0);
    expect(Object.values(vars).join(" ")).toContain("#1D4ED8");
  });
});
