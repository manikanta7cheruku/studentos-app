import { describe, expect, it } from "vitest";
import {
  dateInputOffset,
  dateInputValue,
  deadlineFromDate,
  formatDeadline,
  openSlots,
  statusLabel,
} from "../labels";

describe("team post labels", () => {
  it("says no deadline in plain words", () => {
    expect(formatDeadline(null)).toBe("No deadline");
    expect(formatDeadline("not a date")).toBe("No deadline");
  });

  it("names the statuses for people", () => {
    expect(statusLabel("open")).toBe("Open");
    expect(statusLabel("filled")).toBe("Team is full");
    expect(statusLabel("expired")).toBe("Expired");
  });

  it("counts the places still free across roles", () => {
    const roles = [
      { id: "a", role_name: "A", slots: 3, filled: 1, skills: [], skill_ids: [] },
      { id: "b", role_name: "B", slots: 2, filled: 2, skills: [], skill_ids: [] },
    ];
    expect(openSlots({ roles })).toBe(2);
  });
});

describe("deadline dates", () => {
  it("turns a date input into the end of that day, or null when empty", () => {
    expect(deadlineFromDate("")).toBeNull();
    const iso = deadlineFromDate("2030-05-17");
    expect(iso).toBeTruthy();
    // Back to the same day in the viewer's own time zone.
    expect(dateInputValue(iso)).toBe("2030-05-17");
  });

  it("gives the date input value for no deadline", () => {
    expect(dateInputValue(null)).toBe("");
  });

  it("offsets from a given day for the min and max of the date input", () => {
    const now = new Date(2030, 0, 30);
    expect(dateInputOffset(0, now)).toBe("2030-01-30");
    expect(dateInputOffset(3, now)).toBe("2030-02-02");
    expect(dateInputOffset(180, now)).toBe("2030-07-29");
  });
});
