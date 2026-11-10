import { describe, expect, it } from "vitest";
import type { Application } from "@/lib/api/endpoints";
import {
  countByStatus,
  dateOnlyFromIso,
  daysUntil,
  deadlineWords,
  isOverdue,
  stipendWords,
  visibleApplications,
} from "../format";

const now = new Date(2030, 5, 15, 14, 30); // 15 June 2030

const app = (over: Partial<Application>): Application => ({
  id: "11111111-1111-4111-8111-111111111111",
  company: "Acme",
  role_title: "Intern",
  source_url: null,
  status: "saved",
  deadline: null,
  applied_on: null,
  notes: "",
  opportunity_id: null,
  version: 1,
  created_at: "2030-06-01T00:00:00.000Z",
  updated_at: "2030-06-01T00:00:00.000Z",
  ...over,
});

describe("deadline words", () => {
  it("counts calendar days, not hours", () => {
    expect(daysUntil("2030-06-15", now)).toBe(0);
    expect(daysUntil("2030-06-16", now)).toBe(1);
    expect(daysUntil("2030-06-10", now)).toBe(-5);
    expect(daysUntil("2030-07-15", now)).toBe(30);
  });

  it("says it in plain words for open applications", () => {
    expect(deadlineWords("2030-06-15", "saved", now)).toBe("Due today");
    expect(deadlineWords("2030-06-16", "applied", now)).toBe("Due tomorrow");
    expect(deadlineWords("2030-06-18", "saved", now)).toBe("Due in 3 days");
    expect(deadlineWords("2030-06-14", "saved", now)).toBe("1 day overdue");
    expect(deadlineWords("2030-06-10", "saved", now)).toBe("5 days overdue");
  });

  it("says nothing for finished applications or no deadline", () => {
    expect(deadlineWords("2030-06-10", "rejected", now)).toBeNull();
    expect(deadlineWords("2030-06-10", "offer", now)).toBeNull();
    expect(deadlineWords(null, "saved", now)).toBeNull();
  });

  it("calls only open applications past their date overdue", () => {
    expect(isOverdue({ deadline: "2030-06-10", status: "applied" }, now)).toBe(true);
    expect(isOverdue({ deadline: "2030-06-10", status: "withdrawn" }, now)).toBe(false);
    expect(isOverdue({ deadline: "2030-06-20", status: "saved" }, now)).toBe(false);
    expect(isOverdue({ deadline: null, status: "saved" }, now)).toBe(false);
  });
});

describe("filtering and sorting the tracker", () => {
  const items = [
    app({
      id: "a",
      company: "Zeta",
      status: "saved",
      deadline: "2030-07-01",
      updated_at: "2030-06-03T00:00:00.000Z",
    }),
    app({
      id: "b",
      company: "Alpha Labs",
      status: "applied",
      deadline: "2030-06-20",
      updated_at: "2030-06-02T00:00:00.000Z",
    }),
    app({
      id: "c",
      company: "Midnight",
      status: "applied",
      deadline: null,
      updated_at: "2030-06-05T00:00:00.000Z",
    }),
  ];

  it("counts per status", () => {
    const counts = countByStatus(items);
    expect(counts.all).toBe(3);
    expect(counts.applied).toBe(2);
    expect(counts.offer).toBe(0);
  });

  it("filters by status and by a word in the company or role", () => {
    const names = (list: Application[]) => list.map((i) => i.id);
    expect(
      names(visibleApplications(items, { status: "applied", sort: "updated", q: "" })),
    ).toEqual(["c", "b"]);
    expect(names(visibleApplications(items, { status: "all", sort: "updated", q: "MID" }))).toEqual(
      ["c"],
    );
    expect(
      names(visibleApplications(items, { status: "all", sort: "updated", q: "nothing" })),
    ).toEqual([]);
  });

  it("sorts by the most recent change, or by the nearest deadline with no deadline last", () => {
    const ids = (sort: "updated" | "deadline") =>
      visibleApplications(items, { status: "all", sort, q: "" }).map((i) => i.id);
    expect(ids("updated")).toEqual(["c", "a", "b"]);
    expect(ids("deadline")).toEqual(["b", "a", "c"]);
  });
});

describe("money and dates for opportunities", () => {
  it("writes the stipend in rupees a month", () => {
    expect(stipendWords({ stipend_min: 1500000, stipend_max: 2000000 })).toBe(
      "₹15,000 to ₹20,000 a month",
    );
    expect(stipendWords({ stipend_min: 2000000, stipend_max: 2000000 })).toBe("₹20,000 a month");
    expect(stipendWords({ stipend_min: null, stipend_max: 1000000 })).toBe("₹10,000 a month");
    expect(stipendWords({ stipend_min: null, stipend_max: null })).toBeNull();
  });

  it("turns an ISO time into a deadline date for the tracker", () => {
    expect(dateOnlyFromIso(null)).toBeNull();
    expect(dateOnlyFromIso("not a date")).toBeNull();
    expect(dateOnlyFromIso(new Date(2030, 0, 5, 10).toISOString())).toBe("2030-01-05");
  });
});
