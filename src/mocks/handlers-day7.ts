import { http, HttpResponse } from "msw";
import opp01 from "@/contracts/fixtures/opp-01.success.json";
import opp02 from "@/contracts/fixtures/opp-02.success.json";
import opp03Create from "@/contracts/fixtures/opp-03-create.success.json";
import opp03Delete from "@/contracts/fixtures/opp-03-delete.success.json";
import opp03List from "@/contracts/fixtures/opp-03-list.success.json";
import opp03Patch from "@/contracts/fixtures/opp-03-patch.success.json";
import opp04Delete from "@/contracts/fixtures/opp-04-delete.success.json";
import opp04Put from "@/contracts/fixtures/opp-04-put.success.json";
import rem01 from "@/contracts/fixtures/rem-01.success.json";

// Sample answers for the Day 7 endpoints (opportunities, saved opportunities, reminder setting).
// They return the contract fixtures. Same URLs and methods as the real routes (docs/API_CONTRACT.md section 12).
// tests: src/mocks/handlers-day7.test.ts runs every one of them through the contract schema.
export const day7Handlers = [
  http.get("*/api/v1/c/:slug/opportunities", () => HttpResponse.json(opp01)),
  http.get("*/api/v1/c/:slug/opportunities/:id", () => HttpResponse.json(opp02)),
  http.get("*/api/v1/c/:slug/admin/opportunities", () => HttpResponse.json(opp03List)),
  http.post("*/api/v1/c/:slug/admin/opportunities", () =>
    HttpResponse.json(opp03Create, { status: 201 }),
  ),
  http.patch("*/api/v1/c/:slug/admin/opportunities/:id", () => HttpResponse.json(opp03Patch)),
  http.delete("*/api/v1/c/:slug/admin/opportunities/:id", () => HttpResponse.json(opp03Delete)),
  http.put("*/api/v1/me/saved-opportunities/:id", () => HttpResponse.json(opp04Put)),
  http.delete("*/api/v1/me/saved-opportunities/:id", () => HttpResponse.json(opp04Delete)),
  http.get("*/api/v1/me/reminder-settings", () => HttpResponse.json(rem01)),
  http.put("*/api/v1/me/reminder-settings", () => HttpResponse.json(rem01)),
];
