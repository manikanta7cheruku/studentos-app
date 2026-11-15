import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import * as admin from "@/contracts/admin";
import * as applications from "@/contracts/applications";
import * as auth from "@/contracts/auth";
import * as board from "@/contracts/board";
import * as common from "@/contracts/common";
import * as debates from "@/contracts/debates";
import * as engagement from "@/contracts/engagement";
import * as events from "@/contracts/events";
import * as feedback from "@/contracts/feedback";
import * as ideas from "@/contracts/ideas";
import * as messages from "@/contracts/messages";
import * as moderation from "@/contracts/moderation";
import * as network from "@/contracts/network";
import * as opportunities from "@/contracts/opportunities";
import * as photos from "@/contracts/photos";
import * as profile from "@/contracts/profile";
import * as push from "@/contracts/push";
import { endpoints } from "@/contracts/registry";
import * as setup from "@/contracts/setup";
import * as social from "@/contracts/social";
import * as teamfinder from "@/contracts/teamfinder";
import * as tenant from "@/contracts/tenant";
import * as venues from "@/contracts/venues";

// Contract coverage (R5-D3-1). The registry lists every endpoint and the shape of its answer. An integration test
// proves a shape when it calls expectMatches(<schema>, <the real answer>). This test makes sure no endpoint is forgotten:
// every endpoint that has a response schema must be compared with a real answer somewhere in tests/integration,
// except the known gaps below. A gap can only be removed (when someone adds the check), never silently added.

const modules = {
  admin,
  applications,
  auth,
  board,
  common,
  debates,
  engagement,
  events,
  feedback,
  ideas,
  messages,
  moderation,
  network,
  opportunities,
  photos,
  profile,
  push,
  setup,
  social,
  teamfinder,
  tenant,
  venues,
};

// schema object -> every name it is exported under
const schemaNames = new Map<unknown, string[]>();
for (const exported of Object.values(modules)) {
  for (const [name, value] of Object.entries(exported)) {
    if (value && typeof value === "object" && "safeParse" in value) {
      schemaNames.set(value, [...(schemaNames.get(value) ?? []), name]);
    }
  }
}

const integrationDir = join(process.cwd(), "tests", "integration");
const checked = new Set<string>();
for (const file of readdirSync(integrationDir).filter((name) => name.endsWith(".ts"))) {
  const source = readFileSync(join(integrationDir, file), "utf8");
  for (const match of source.matchAll(/expectMatches\(\s*(\w+)/g)) checked.add(match[1]!);
}

const withResponse = endpoints.filter((endpoint) => endpoint.response);
const label = (endpoint: (typeof endpoints)[number]) =>
  `${endpoint.id} ${endpoint.method} ${endpoint.path}`;

// Endpoints whose answer no integration test compares with its schema yet. Remove a line when you add the check.
// Known gaps on 2026-11-15: 47 endpoints of other features (debates, venues, messages, networking, push, profile, feedback, board).
// Owner: R2 (backend) with each feature's author. Coverage is per schema: two endpoints that share one schema object
// (for example joinInviteResponse and joinOpenResponse) count as covered when either one is checked.
const knownGaps: string[] = [
  "BRD-05 DELETE /c/{slug}/board/{id}",
  "BRD-07 POST /c/{slug}/board/{id}/messages",
  "BRD-08 PUT /c/{slug}/board/{id}/photo",
  "COL-01 POST /colleges/setup",
  "COL-02 GET /colleges/suggest",
  "DEB-01 POST /c/{slug}/debates",
  "DEB-02 GET /c/{slug}/debates",
  "DEB-03 GET /c/{slug}/debates/{id}",
  "DEB-04 PUT /c/{slug}/debates/{id}/side",
  "DEB-05 POST /c/{slug}/debates/{id}/arguments",
  "DEB-06 GET /c/{slug}/debates/{id}/arguments",
  "DEB-07 PUT /c/{slug}/debates/{id}/arguments/{argId}/vote",
  "DEB-08 DELETE /c/{slug}/debates/{id}",
  "DEB-09 DELETE /c/{slug}/debates/{id}/arguments/{argId}",
  "DEB-10 PUT /c/{slug}/debates/{id}/invites",
  "FDB-01 POST /me/feedback",
  "FOL-01 DELETE /me/follows/{userId}",
  "FOL-01 PUT /me/follows/{userId}",
  "FOL-02 GET /me/connections",
  "INV-01 GET /me/invite",
  "INV-02 POST /me/referral",
  "MSG-01 GET /c/{slug}/messages",
  "MSG-02 GET /c/{slug}/messages/{userId}",
  "MSG-03 POST /c/{slug}/messages/{userId}",
  "MSG-05 POST /c/{slug}/messages/{userId}/decline",
  "NET-01 GET /c/{slug}/network/suggestions",
  "NET-02 GET /me/network",
  "NET-03 GET /c/{slug}/network/connections",
  "PHO-01 POST /c/{slug}/photos/upload-url",
  "PRF-01 GET /me/profile",
  "PRF-01 PATCH /me/profile",
  "PRF-03 GET /skills",
  "PRF-04 POST /me/avatar",
  "PRF-04 POST /me/avatar/upload-url",
  "PSH-03 POST /me/push/test",
  "RPT-05 GET /me/blocks",
  "TMF-12 GET /c/{slug}/team-posts/{id}/participants",
  "VEN-01 GET /c/{slug}/venues",
  "VEN-02 POST /c/{slug}/venues",
  "VEN-03 GET /c/{slug}/venues/{id}",
  "VEN-04 DELETE /c/{slug}/venues/{id}",
  "VEN-05 GET /c/{slug}/venues/{id}/slots",
  "VEN-06 POST /c/{slug}/venues/{id}/bookings",
  "VEN-07 GET /c/{slug}/venues/{id}/bookings",
  "VEN-08 GET /c/{slug}/me/bookings",
  "VEN-09 POST /c/{slug}/bookings/{id}/decision",
  "VEN-10 DELETE /c/{slug}/bookings/{id}",
];

describe("contract coverage: real answers are compared with src/contracts", () => {
  it("the scan of tests/integration still finds the checks (guard against a changed test style)", () => {
    expect(checked.size).toBeGreaterThan(40);
  });

  it("every response schema in the registry is exported by name, so it can be found", () => {
    const unnamed = withResponse.filter((endpoint) => !schemaNames.has(endpoint.response));
    expect(unnamed.map(label)).toEqual([]);
  });

  it("every endpoint with a response schema is compared with a real answer, except the known gaps", () => {
    const uncovered = withResponse
      .filter(
        (endpoint) => !(schemaNames.get(endpoint.response) ?? []).some((name) => checked.has(name)),
      )
      .map(label)
      .sort();
    expect(
      uncovered,
      "A new endpoint has no expectMatches(...) in tests/integration, or a known gap is now covered (delete its line).",
    ).toEqual([...knownGaps].sort());
  });
});
