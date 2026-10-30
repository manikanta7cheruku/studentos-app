import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { ZodType } from "zod";
import * as c from "./index";

const fixturesDir = join(__dirname, "fixtures");
const files = readdirSync(fixturesDir).filter((name) => name.endsWith(".json"));
const load = (name: string): unknown => JSON.parse(readFileSync(join(fixturesDir, name), "utf8"));

// Fixture file name = <operation>.<kind>.json. kind is request, query, success or error-<code>.
// This map says which schema each fixture must pass.
type Kinds = { request?: ZodType; query?: ZodType; success?: ZodType };
const operations: Record<string, Kinds> = {
  "auth-01": { request: c.otpRequestBody, success: c.otpRequestResponse },
  "auth-02": { request: c.otpVerifyBody, success: c.otpVerifyResponse },
  "auth-03": { query: c.logoutQuery, success: c.logoutResponse },
  "auth-04": { success: c.deleteMeResponse },
  "ten-01": { success: c.publicCollegeResponse },
  "ten-02": { success: c.myMembershipResponse },
  "ten-02-none": { success: c.myMembershipResponse },
  "ten-03": { request: c.joinInviteBody, success: c.joinInviteResponse },
  "ten-04": { request: c.joinManualBody, success: c.joinManualResponse },
  "ten-05-start": { request: c.joinEmailDomainBody, success: c.joinEmailDomainStartResponse },
  "ten-05-complete": { request: c.joinEmailDomainBody, success: c.joinEmailDomainCompleteResponse },
  "ten-07": { success: c.leaveResponse },
  "prf-01-get": { success: c.profileResponse },
  "prf-01-patch": { request: c.profilePatchBody, success: c.profileResponse },
  "prf-02": { request: c.skillsPutBody, success: c.skillsPutResponse },
  "prf-03": { query: c.skillSearchQuery, success: c.skillSearchResponse },
  "adm-03-get": { success: c.adminSettingsResponse },
  "adm-03-patch": { request: c.adminSettingsPatchBody, success: c.adminSettingsResponse },
  "adm-05-create": { request: c.inviteCreateBody, success: c.inviteCreateResponse },
  "adm-05-list": { success: c.inviteListResponse },
  "adm-05-revoke": { success: c.inviteRevokeResponse },
  "adm-06": { query: c.verificationRequestQuery, success: c.verificationRequestListResponse },
  "adm-07-approve": {
    request: c.verificationDecisionBody,
    success: c.verificationDecisionResponse,
  },
  "adm-07-reject": { request: c.verificationDecisionBody, success: c.verificationDecisionResponse },
  "adm-08": { query: c.memberListQuery, success: c.memberListResponse },
  "adm-09": { request: c.memberPatchBody, success: c.memberPatchResponse },
  "adm-10": { query: c.auditLogQuery, success: c.auditLogListResponse },
  "ntf-01": { query: c.notificationListQuery, success: c.notificationListResponse },
  "ntf-02": { request: c.notificationReadBody, success: c.notificationReadResponse },
  "ntf-02-all": { request: c.notificationReadBody },
  "ann-01": { success: c.announcementListResponse },
  "ann-02-create": { request: c.announcementCreateBody, success: c.announcementResponse },
  "ann-02-patch": { request: c.announcementPatchBody, success: c.announcementResponse },
  "rpt-01": { request: c.reportCreateBody, success: c.reportCreateResponse },
  "rpt-02": { query: c.reportQueueQuery, success: c.reportQueueResponse },
  "rpt-03": { request: c.reportActionBody, success: c.reportActionResponse },
  "wl-01": { request: c.waitlistBody, success: c.waitlistResponse },
};

const parseName = (file: string) => {
  const [operation = "", kind = ""] = file.replace(/\.json$/, "").split(".");
  return { operation, kind };
};
const toErrorCode = (kind: string) =>
  kind
    .replace(/^error-/, "")
    .toUpperCase()
    .replaceAll("-", "_");

describe("every fixture passes its schema", () => {
  it("has fixtures", () => {
    expect(files.length).toBeGreaterThan(50);
  });

  for (const file of files) {
    const { operation, kind } = parseName(file);

    if (kind.startsWith("error-")) {
      it(`${file} is a valid error envelope with the matching code`, () => {
        const parsed = c.errorEnvelope.parse(load(file));
        expect(parsed.error.code).toBe(toErrorCode(kind));
      });
      continue;
    }

    it(`${file} passes its schema`, () => {
      const schema = operations[operation]?.[kind as keyof Kinds];
      expect(schema, `no schema registered for ${file}`).toBeDefined();
      const result = schema?.safeParse(load(file));
      expect(result?.success, JSON.stringify(result?.error?.issues)).toBe(true);
    });
  }
});

describe("fixture coverage", () => {
  const names = new Set(files.map((file) => file.replace(/\.json$/, "")));

  it("has a success sample for every registered response", () => {
    for (const [operation, kinds] of Object.entries(operations)) {
      for (const kind of Object.keys(kinds)) {
        expect(names.has(`${operation}.${kind}`), `missing fixture ${operation}.${kind}.json`).toBe(
          true,
        );
      }
    }
  });

  it("has an error sample for every error code", () => {
    const seen = new Set(
      files
        .map((file) => parseName(file).kind)
        .filter((kind) => kind.startsWith("error-"))
        .map(toErrorCode),
    );
    for (const code of c.errorCodes) {
      expect(seen.has(code), `no error sample for ${code}`).toBe(true);
    }
  });

  it("knows the HTTP status of every error code", () => {
    for (const code of c.errorCodes) {
      expect(c.errorHttpStatus[code], code).toBeGreaterThanOrEqual(400);
    }
  });
});

describe("bad input is rejected", () => {
  const reject = (schema: ZodType, value: unknown) =>
    expect(schema.safeParse(value).success).toBe(false);

  it("error envelope: unknown code, and VALIDATION_FAILED without fields", () => {
    reject(c.errorEnvelope, { error: { code: "MADE_UP", message: "x", request_id: "r" } });
    reject(c.errorEnvelope, {
      error: { code: "VALIDATION_FAILED", message: "x", request_id: "r" },
    });
  });

  it("OTP: code must be 6 digits, email must be valid, unknown keys are refused", () => {
    reject(c.otpVerifyBody, { email: "a@alpha.test", code: "12345" });
    reject(c.otpVerifyBody, { email: "a@alpha.test", code: "12345a" });
    reject(c.otpRequestBody, { email: "not-an-email" });
    reject(c.otpRequestBody, { email: "a@alpha.test", is_admin: true });
  });

  it("email is lower-cased and trimmed", () => {
    expect(c.otpRequestBody.parse({ email: "  Student1@Alpha.TEST " }).email).toBe(
      "student1@alpha.test",
    );
  });

  it("invite code is upper-cased and trimmed, and cannot be empty or too long", () => {
    expect(c.joinInviteBody.parse({ code: " alpha-7k3q " }).code).toBe("ALPHA-7K3Q");
    reject(c.joinInviteBody, { code: "" });
    reject(c.joinInviteBody, { code: "A".repeat(33) });
  });

  it("a client cannot send a role or status when joining", () => {
    reject(c.joinInviteBody, { code: "ALPHA-7K3Q", role: "college_admin" });
    reject(c.joinManualBody, {
      enrollment_number: "21AB1A0501",
      program: "CSE",
      grad_year: 2027,
      status: "active",
    });
  });

  it("rejecting a request needs a reason of 5 characters or more", () => {
    reject(c.verificationDecisionBody, { decision: "rejected" });
    reject(c.verificationDecisionBody, { decision: "rejected", reason: "no" });
    expect(c.verificationDecisionBody.safeParse({ decision: "approved" }).success).toBe(true);
  });

  it("suspending or removing a member needs a reason, and an empty patch is refused", () => {
    reject(c.memberPatchBody, {});
    reject(c.memberPatchBody, { status: "suspended" });
    expect(c.memberPatchBody.safeParse({ role: "moderator" }).success).toBe(true);
  });

  it("settings patch must change something and use known methods", () => {
    reject(c.adminSettingsPatchBody, {});
    reject(c.adminSettingsPatchBody, { allowed_methods: ["sms"] });
    reject(c.adminSettingsPatchBody, { allowed_methods: [] });
  });

  it("profile patch: bad handle, too many interests, empty body", () => {
    reject(c.profilePatchBody, {});
    reject(c.profilePatchBody, { handle: "Bad Handle!" });
    reject(c.profilePatchBody, { interests: Array.from({ length: 21 }, (_, i) => `tag${i}`) });
    reject(c.profilePatchBody, {
      user_id: "aaaaaaaa-1000-4000-8000-000000000003",
      display_name: "x",
    });
  });

  it("skills: levels 1 to 5, https links only, no duplicates", () => {
    const id = "88888888-8888-4888-8888-888888888888";
    reject(c.skillsPutBody, { skills: [{ skill_id: id, level: 6 }] });
    reject(c.skillsPutBody, {
      skills: [{ skill_id: id, level: 3, evidence_url: "http://example.org" }],
    });
    reject(c.skillsPutBody, {
      skills: [
        { skill_id: id, level: 3 },
        { skill_id: id, level: 4 },
      ],
    });
  });

  it("report action: everything except dismiss needs a note", () => {
    reject(c.reportActionBody, { action: "hide" });
    expect(c.reportActionBody.safeParse({ action: "dismiss" }).success).toBe(true);
  });

  it("waitlist: consent must be exactly true", () => {
    const base = {
      college_name: "Gamma",
      contact_name: "Test",
      contact_email: "a@gamma.test",
      role: "other",
    };
    reject(c.waitlistBody, { ...base, consent: false });
    reject(c.waitlistBody, base);
  });

  it("pagination: limit 1 to 50, default 20", () => {
    expect(c.paginationQuery.parse({}).limit).toBe(20);
    reject(c.paginationQuery, { limit: "0" });
    reject(c.paginationQuery, { limit: "51" });
    reject(c.paginationQuery, { limit: "10", sort: "created_at" });
  });
});
