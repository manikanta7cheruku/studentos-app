import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { setupServer } from "msw/node";
import type { ZodType } from "zod";
import * as c from "@/contracts";
import { day4And5Handlers } from "./handlers-day4-5";

// Every sample endpoint must answer with a body that passes the contract schema of the real endpoint.
const server = setupServer(...day4And5Handlers);
beforeAll(() => server.listen());
afterAll(() => server.close());

const base = "http://localhost:3000/api/v1";
const cases: [string, string, string, ZodType][] = [
  ["NTF-01", "GET", "/me/notifications", c.notificationListResponse],
  ["NTF-02", "POST", "/me/notifications/read", c.notificationReadResponse],
  ["ANN-01", "GET", "/c/alpha/announcements", c.announcementListResponse],
  ["ANN-02", "POST", "/c/alpha/admin/announcements", c.announcementResponse],
  ["RPT-01", "POST", "/c/alpha/reports", c.reportCreateResponse],
  ["RPT-02", "GET", "/c/alpha/admin/reports", c.reportQueueResponse],
  ["RPT-03", "POST", "/c/alpha/admin/reports/x/action", c.reportActionResponse],
  ["WL-01", "POST", "/waitlist", c.waitlistResponse],
  ["TMF-02", "GET", "/c/alpha/team-posts", c.teamPostListResponse],
  ["TMF-01", "POST", "/c/alpha/team-posts", c.teamPostResponse],
  ["TMF-03", "GET", "/c/alpha/team-posts/x", c.teamPostResponse],
  ["TMF-05", "POST", "/c/alpha/team-posts/x/close", c.teamPostResponse],
  ["TMF-07", "GET", "/c/alpha/team-posts/x/requests", c.joinRequestListResponse],
  ["TMF-06", "POST", "/c/alpha/team-posts/x/roles/y/requests", c.joinRequestCreateResponse],
  ["TMF-08", "POST", "/c/alpha/join-requests/x/decision", c.joinRequestDecisionResponse],
  ["TMF-09", "DELETE", "/c/alpha/join-requests/x", c.joinRequestWithdrawResponse],
  ["TMF-10", "GET", "/c/alpha/me/join-requests", c.myJoinRequestListResponse],
];

describe("sample handlers for Day 4 and Day 5 endpoints", () => {
  for (const [id, method, path, schema] of cases) {
    it(`${id} ${method} ${path} answers a body that matches the contract`, async () => {
      const response = await fetch(`${base}${path}`, { method });
      expect(response.status).toBeLessThan(300);
      const result = schema.safeParse(await response.json());
      expect(result.success, JSON.stringify(result.error?.issues)).toBe(true);
    });
  }

  it("has a sample for every Day 4 and Day 5 endpoint of the real API", () => {
    expect(day4And5Handlers).toHaveLength(cases.length);
  });
});
