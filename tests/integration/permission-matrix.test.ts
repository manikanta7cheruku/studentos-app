import { beforeAll, describe, expect, it } from "vitest";
import { POST as otpRequest } from "@/app/api/v1/auth/otp/request/route";
import { POST as otpVerify } from "@/app/api/v1/auth/otp/verify/route";
import { POST as logout } from "@/app/api/v1/auth/logout/route";
import { GET as myMembership } from "@/app/api/v1/c/[slug]/me/membership/route";
import { GET as publicCollege } from "@/app/api/v1/colleges/public/[slug]/route";
import { POST as joinInvite } from "@/app/api/v1/c/[slug]/join/invite/route";
import { POST as joinManual } from "@/app/api/v1/c/[slug]/join/manual/route";
import { POST as joinEmailDomain } from "@/app/api/v1/c/[slug]/join/email-domain/route";
import { GET as adminSettings } from "@/app/api/v1/c/[slug]/admin/settings/route";
import { GET as adminStats } from "@/app/api/v1/c/[slug]/admin/stats/route";
import { GET as adminInvites } from "@/app/api/v1/c/[slug]/admin/invites/route";
import { GET as adminQueue } from "@/app/api/v1/c/[slug]/admin/verification-requests/route";
import { GET as adminMembers } from "@/app/api/v1/c/[slug]/admin/members/route";
import { GET as adminAudit } from "@/app/api/v1/c/[slug]/admin/audit-logs/route";
import { requireMember, type MembershipRow } from "@/modules/tenancy/require-member";
import { CookieJar } from "@/lib/supabase/request-client";
import { AppError } from "@/lib/errors";
import { call, clearInbox, clearRateLimits, signIn } from "./helpers";
import { randomUUID } from "node:crypto";

// R5 gate: who may call what. Expected results come from docs/AUTH_AND_TENANCY.md section 4
// (permission matrix) and docs/API_CONTRACT.md section 3. Uses the seed users of Alpha and Beta.
//
// To cover a new endpoint: add it to `endpoints` (real route) or `guards` (requireMember rule),
// with one expectation per principal. A missing principal makes the test fail on purpose.

const routes = { request: otpRequest, verify: otpVerify };
const APP = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

type Principal =
  | "anon"
  | "pending"
  | "suspended"
  | "student_l1"
  | "student_l2"
  | "moderator"
  | "admin"
  | "other_college_student"
  | "other_college_admin";

const principals: Record<Principal, string | null> = {
  anon: null,
  pending: "pending@alpha.test",
  suspended: "suspended@alpha.test",
  student_l1: "student3@alpha.test",
  student_l2: "student1@alpha.test",
  moderator: "moderator@alpha.test",
  admin: "admin@alpha.test",
  other_college_student: "student1@beta.test",
  other_college_admin: "admin@beta.test",
};
const allPrincipals = Object.keys(principals) as Principal[];

const cookies = {} as Record<Principal, string | undefined>;

beforeAll(async () => {
  await clearInbox();
  await clearRateLimits();
  for (const principal of allPrincipals) {
    const email = principals[principal];
    cookies[principal] = email ? (await signIn(routes, email)).cookie : undefined;
  }
}, 120_000);

// ---------------------------------------------------------------------------
// 1. Guards: what requireMember lets through, for a college called "alpha"
// ---------------------------------------------------------------------------
type Outcome =
  | "ok"
  | "UNAUTHENTICATED"
  | "NOT_FOUND"
  | "MEMBERSHIP_NOT_ACTIVE"
  | "VERIFICATION_LEVEL_TOO_LOW"
  | "FORBIDDEN";

const guards: {
  name: string;
  minLevel?: number;
  roles?: MembershipRow["role"][];
  expect: Record<Principal, Outcome>;
}[] = [
  {
    name: "member endpoint (mem(1)): read posts, people, projects",
    minLevel: 1,
    expect: {
      anon: "UNAUTHENTICATED",
      pending: "MEMBERSHIP_NOT_ACTIVE",
      suspended: "MEMBERSHIP_NOT_ACTIVE",
      student_l1: "ok",
      student_l2: "ok",
      moderator: "ok",
      admin: "ok",
      other_college_student: "NOT_FOUND",
      other_college_admin: "NOT_FOUND",
    },
  },
  {
    name: "level 2 endpoint (mem(2)): for example marketplace or notes later",
    minLevel: 2,
    expect: {
      anon: "UNAUTHENTICATED",
      pending: "MEMBERSHIP_NOT_ACTIVE",
      suspended: "MEMBERSHIP_NOT_ACTIVE",
      student_l1: "VERIFICATION_LEVEL_TOO_LOW",
      student_l2: "ok",
      moderator: "ok",
      admin: "ok",
      other_college_student: "NOT_FOUND",
      other_college_admin: "NOT_FOUND",
    },
  },
  {
    name: "moderator endpoint (mod): hide content, announcements, reports",
    minLevel: 1,
    roles: ["moderator", "college_admin"],
    expect: {
      anon: "UNAUTHENTICATED",
      pending: "MEMBERSHIP_NOT_ACTIVE",
      suspended: "MEMBERSHIP_NOT_ACTIVE",
      student_l1: "FORBIDDEN",
      student_l2: "FORBIDDEN",
      moderator: "ok",
      admin: "ok",
      other_college_student: "NOT_FOUND",
      other_college_admin: "NOT_FOUND",
    },
  },
  {
    name: "admin endpoint (adm): invites, settings, members, audit log",
    minLevel: 1,
    roles: ["college_admin"],
    expect: {
      anon: "UNAUTHENTICATED",
      pending: "MEMBERSHIP_NOT_ACTIVE",
      suspended: "MEMBERSHIP_NOT_ACTIVE",
      student_l1: "FORBIDDEN",
      student_l2: "FORBIDDEN",
      moderator: "FORBIDDEN",
      admin: "ok",
      other_college_student: "NOT_FOUND",
      other_college_admin: "NOT_FOUND",
    },
  },
];

async function guardOutcome(
  principal: Principal,
  guard: (typeof guards)[number],
): Promise<Outcome> {
  const cookie = cookies[principal];
  const request = new Request(`${APP}/x`, { headers: cookie ? { cookie } : {} });
  try {
    await requireMember(request, new CookieJar(), "alpha", {
      minLevel: guard.minLevel,
      roles: guard.roles,
    });
    return "ok";
  } catch (error) {
    if (error instanceof AppError) return error.code as Outcome;
    throw error;
  }
}

describe("guards (requireMember) follow the permission matrix", () => {
  for (const guard of guards) {
    describe(guard.name, () => {
      it("covers every principal", () => {
        expect(Object.keys(guard.expect).sort()).toEqual([...allPrincipals].sort());
      });
      for (const principal of allPrincipals) {
        it(`${principal} -> ${guard.expect[principal]}`, async () => {
          expect(await guardOutcome(principal, guard)).toBe(guard.expect[principal]);
        });
      }
    });
  }

  it("a guard for another college's slug never reveals that the college exists", async () => {
    const cookie = cookies.student_l2;
    const asker = async (slug: string) =>
      requireMember(
        new Request(`${APP}/x`, { headers: { cookie: cookie! } }),
        new CookieJar(),
        slug,
      ).catch((e) => (e as AppError).code);
    expect(await asker("beta")).toBe("NOT_FOUND");
    expect(await asker("does-not-exist")).toBe("NOT_FOUND");
  });
});

// ---------------------------------------------------------------------------
// 2. Real endpoints: status code per principal
// ---------------------------------------------------------------------------
type Call = (cookie: string | undefined) => Promise<number>;
// "skip" = the call would change data, so it is not made for this principal.
type Expected = number | "skip";

const idem = () => ({ "idempotency-key": randomUUID() });

const endpoints: { op: string; call: Call; expect: Record<Principal, Expected> }[] = [
  {
    op: "TEN-01 GET /colleges/public/alpha (public)",
    call: (cookie) =>
      call(publicCollege, {
        path: "/api/v1/colleges/public/alpha",
        params: { slug: "alpha" },
        cookie,
      }).then((r) => r.status),
    expect: Object.fromEntries(allPrincipals.map((p) => [p, 200])) as Record<Principal, Expected>,
  },
  {
    op: "TEN-02 GET /c/alpha/me/membership (any signed-in user)",
    call: (cookie) =>
      call(myMembership, {
        path: "/api/v1/c/alpha/me/membership",
        params: { slug: "alpha" },
        cookie,
      }).then((r) => r.status),
    expect: {
      anon: 401,
      pending: 200,
      suspended: 200,
      student_l1: 200,
      student_l2: 200,
      moderator: 200,
      admin: 200,
      other_college_student: 200,
      other_college_admin: 200,
    },
  },
  {
    op: "AUTH-03 POST /auth/logout (needs a session)",
    // A bad query parameter is the probe: 401 for anon, 400 for everyone signed in. No session is ended.
    call: (cookie) =>
      call(logout, { method: "POST", path: "/api/v1/auth/logout?probe=1", cookie }).then(
        (r) => r.status,
      ),
    expect: {
      anon: 401,
      pending: 400,
      suspended: 400,
      student_l1: 400,
      student_l2: 400,
      moderator: 400,
      admin: 400,
      other_college_student: 400,
      other_college_admin: 400,
    },
  },
  {
    op: "TEN-03 POST /c/alpha/join/invite (a member or a person waiting gets CONFLICT, suspended gets FORBIDDEN)",
    call: (cookie) =>
      call(joinInvite, {
        method: "POST",
        path: "/api/v1/c/alpha/join/invite",
        json: { code: "NO-SUCH-CODE" },
        params: { slug: "alpha" },
        cookie,
        headers: idem(),
      }).then((r) => r.status),
    expect: {
      anon: 401,
      pending: 409,
      suspended: 403,
      student_l1: 409,
      student_l2: 409,
      moderator: 409,
      admin: 409,
      other_college_student: 400,
      other_college_admin: 400,
    },
  },
  {
    op: "TEN-04 POST /c/alpha/join/manual (same rules as TEN-03)",
    call: (cookie) =>
      call(joinManual, {
        method: "POST",
        path: "/api/v1/c/alpha/join/manual",
        json: { enrollment_number: "MATRIX0001", program: "CSE", grad_year: 2028 },
        params: { slug: "alpha" },
        cookie,
        headers: idem(),
      }).then((r) => r.status),
    expect: {
      anon: 401,
      pending: 409,
      suspended: 403,
      student_l1: 409,
      student_l2: 409,
      moderator: 409,
      admin: 409,
      other_college_student: "skip",
      other_college_admin: "skip",
    },
  },
  {
    op: "TEN-05 POST /c/alpha/join/email-domain start (same rules, plus a college address is needed)",
    call: (cookie) =>
      call(joinEmailDomain, {
        method: "POST",
        path: "/api/v1/c/alpha/join/email-domain",
        json: { step: "start", email: "nobody@gmail.com" },
        params: { slug: "alpha" },
        cookie,
      }).then((r) => r.status),
    expect: {
      anon: 401,
      pending: 409,
      suspended: 403,
      student_l1: 409,
      student_l2: 409,
      moderator: 409,
      admin: 409,
      other_college_student: 400,
      other_college_admin: 400,
    },
  },
  ...(
    [
      ["ADM-03 GET /admin/settings", adminSettings, "settings"],
      ["ADM-11 GET /admin/stats", adminStats, "stats"],
      ["ADM-05 GET /admin/invites", adminInvites, "invites"],
      ["ADM-06 GET /admin/verification-requests", adminQueue, "verification-requests"],
      ["ADM-08 GET /admin/members", adminMembers, "members"],
      ["ADM-10 GET /admin/audit-logs", adminAudit, "audit-logs"],
    ] as const
  ).map(([op, handler, path]) => ({
    op,
    call: (cookie: string | undefined) =>
      call(handler, {
        path: `/api/v1/c/alpha/admin/${path}`,
        params: { slug: "alpha" },
        cookie,
      }).then((r) => r.status),
    // Only an active admin of Alpha gets through. A student or moderator is 403, a pending or suspended
    // member is 403, someone from another college is 404 (never confirms the college), nobody signed in is 401.
    expect: {
      anon: 401,
      pending: 403,
      suspended: 403,
      student_l1: 403,
      student_l2: 403,
      moderator: 403,
      admin: 200,
      other_college_student: 404,
      other_college_admin: 404,
    } as Record<Principal, Expected>,
  })),
];

describe("real endpoints follow the permission matrix", () => {
  for (const endpoint of endpoints) {
    describe(endpoint.op, () => {
      it("covers every principal", () => {
        expect(Object.keys(endpoint.expect).sort()).toEqual([...allPrincipals].sort());
      });
      for (const principal of allPrincipals) {
        it(`${principal} -> ${endpoint.expect[principal]}`, async ({ skip }) => {
          const expected = endpoint.expect[principal];
          if (expected === "skip") return skip();
          expect(await endpoint.call(cookies[principal])).toBe(expected);
        });
      }
    });
  }
});
