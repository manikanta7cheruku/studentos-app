import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { setupServer } from "msw/node";
import type { ZodType } from "zod";
import * as c from "@/contracts";
import { day7Handlers } from "./handlers-day7";

// Every sample endpoint must answer with a body that passes the contract schema of the real endpoint.
const server = setupServer(...day7Handlers);
beforeAll(() => server.listen());
afterAll(() => server.close());

const base = "http://localhost:3000/api/v1";
const cases: [string, string, string, ZodType][] = [
  ["OPP-01", "GET", "/c/alpha/opportunities", c.opportunityListResponse],
  ["OPP-02", "GET", "/c/alpha/opportunities/x", c.opportunityResponse],
  ["OPP-03", "GET", "/c/alpha/admin/opportunities", c.adminOpportunityListResponse],
  ["OPP-03", "POST", "/c/alpha/admin/opportunities", c.opportunityResponse],
  ["OPP-03", "PATCH", "/c/alpha/admin/opportunities/x", c.opportunityResponse],
  ["OPP-03", "DELETE", "/c/alpha/admin/opportunities/x", c.opportunityRemoveResponse],
  ["OPP-04", "PUT", "/me/saved-opportunities/x", c.savedOpportunityResponse],
  ["OPP-04", "DELETE", "/me/saved-opportunities/x", c.savedOpportunityResponse],
  ["REM-01", "GET", "/me/reminder-settings", c.reminderSettingsResponse],
  ["REM-01", "PUT", "/me/reminder-settings", c.reminderSettingsResponse],
];

describe("sample handlers for Day 7 endpoints", () => {
  for (const [id, method, path, schema] of cases) {
    it(`${id} ${method} ${path} answers a body that matches the contract`, async () => {
      const response = await fetch(`${base}${path}`, { method });
      expect(response.status).toBeLessThan(300);
      const result = schema.safeParse(await response.json());
      expect(result.success, JSON.stringify(result.error?.issues)).toBe(true);
    });
  }

  it("has a sample for every Day 7 endpoint of the real API", () => {
    expect(day7Handlers).toHaveLength(cases.length);
  });
});
