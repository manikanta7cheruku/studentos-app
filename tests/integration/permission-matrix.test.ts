import { beforeAll, describe, expect, it } from "vitest";
import { POST as otpRequest } from "@/app/api/v1/auth/otp/request/route";
import { POST as otpVerify } from "@/app/api/v1/auth/otp/verify/route";
import { POST as logout } from "@/app/api/v1/auth/logout/route";
import { GET as myMembership } from "@/app/api/v1/c/[slug]/me/membership/route";
import { GET as publicCollege } from "@/app/api/v1/colleges/public/[slug]/route";
import { POST as joinInvite } from "@/app/api/v1/c/[slug]/join/invite/route";
import {
  GET as listApplications,
  POST as createApplication,
} from "@/app/api/v1/me/applications/route";
import {
  DELETE as deleteApplication,
  GET as getApplication,
  PATCH as patchApplication,
} from "@/app/api/v1/me/applications/[id]/route";
import { POST as changeApplicationStatus } from "@/app/api/v1/me/applications/[id]/status/route";
import { GET as googleStart } from "@/app/api/v1/auth/google/route";
import { GET as googleCallback } from "@/app/api/v1/auth/google/callback/route";
import { POST as joinOpen } from "@/app/api/v1/c/[slug]/join/open/route";
import { POST as joinManual } from "@/app/api/v1/c/[slug]/join/manual/route";
import { POST as joinEmailDomain } from "@/app/api/v1/c/[slug]/join/email-domain/route";
import { GET as adminSettings } from "@/app/api/v1/c/[slug]/admin/settings/route";
import { GET as adminStats } from "@/app/api/v1/c/[slug]/admin/stats/route";
import { GET as adminInvites } from "@/app/api/v1/c/[slug]/admin/invites/route";
import { GET as adminQueue } from "@/app/api/v1/c/[slug]/admin/verification-requests/route";
import { GET as adminMembers } from "@/app/api/v1/c/[slug]/admin/members/route";
import { GET as adminAudit } from "@/app/api/v1/c/[slug]/admin/audit-logs/route";
import { GET as myNotifications } from "@/app/api/v1/me/notifications/route";
import { POST as readNotifications } from "@/app/api/v1/me/notifications/read/route";
import { GET as announcementsList } from "@/app/api/v1/c/[slug]/announcements/route";
import { GET as modAnnouncements } from "@/app/api/v1/c/[slug]/admin/announcements/route";
import { GET as modReports } from "@/app/api/v1/c/[slug]/admin/reports/route";
import { POST as fileReport } from "@/app/api/v1/c/[slug]/reports/route";
import { POST as actOnReport } from "@/app/api/v1/c/[slug]/admin/reports/[id]/action/route";
import { PUT as blockUser } from "@/app/api/v1/me/blocks/[userId]/route";
import { POST as waitlist } from "@/app/api/v1/waitlist/route";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { POST as maintenance } from "@/app/api/internal/maintenance/route";
import { GET as health } from "@/app/api/health/route";
import { GET as ready } from "@/app/api/ready/route";
import { PATCH as patchSettings } from "@/app/api/v1/c/[slug]/admin/settings/route";
import { POST as createInvite } from "@/app/api/v1/c/[slug]/admin/invites/route";
import { DELETE as revokeInvite } from "@/app/api/v1/c/[slug]/admin/invites/[id]/route";
import { POST as decideRequest } from "@/app/api/v1/c/[slug]/admin/verification-requests/[id]/decision/route";
import { PATCH as patchMember } from "@/app/api/v1/c/[slug]/admin/members/[membershipId]/route";
import { POST as postAnnouncement } from "@/app/api/v1/c/[slug]/admin/announcements/route";
import {
  DELETE as deleteAnnouncement,
  PATCH as patchAnnouncement,
} from "@/app/api/v1/c/[slug]/admin/announcements/[id]/route";
import { DELETE as unblockUser } from "@/app/api/v1/me/blocks/[userId]/route";
import { GET as myProfile, PATCH as patchProfile } from "@/app/api/v1/me/profile/route";
import { GET as mySkills, PUT as putSkills } from "@/app/api/v1/me/skills/route";
import { GET as skillSearch } from "@/app/api/v1/skills/route";
import { POST as uploadAvatar } from "@/app/api/v1/me/avatar/route";
import { POST as avatarUploadUrl } from "@/app/api/v1/me/avatar/upload-url/route";
import { GET as peopleList } from "@/app/api/v1/c/[slug]/people/route";
import { GET as tmfList, POST as tmfCreate } from "@/app/api/v1/c/[slug]/team-posts/route";
import { GET as tmfGet, PATCH as tmfPatch } from "@/app/api/v1/c/[slug]/team-posts/[id]/route";
import { POST as tmfClose } from "@/app/api/v1/c/[slug]/team-posts/[id]/close/route";
import { POST as tmfRequest } from "@/app/api/v1/c/[slug]/team-posts/[id]/roles/[roleId]/requests/route";
import { GET as tmfRequests } from "@/app/api/v1/c/[slug]/team-posts/[id]/requests/route";
import { POST as tmfDecision } from "@/app/api/v1/c/[slug]/join-requests/[id]/decision/route";
import { DELETE as tmfWithdraw } from "@/app/api/v1/c/[slug]/join-requests/[id]/route";
import { GET as tmfMine } from "@/app/api/v1/c/[slug]/me/join-requests/route";
import { GET as oppList } from "@/app/api/v1/c/[slug]/opportunities/route";
import { GET as oppGet } from "@/app/api/v1/c/[slug]/opportunities/[id]/route";
import {
  GET as oppAdminList,
  POST as oppCreate,
} from "@/app/api/v1/c/[slug]/admin/opportunities/route";
import {
  DELETE as oppRemove,
  PATCH as oppPatch,
} from "@/app/api/v1/c/[slug]/admin/opportunities/[id]/route";
import {
  DELETE as oppUnsave,
  PUT as oppSave,
} from "@/app/api/v1/me/saved-opportunities/[id]/route";
import { GET as remGet, PUT as remPut } from "@/app/api/v1/me/reminder-settings/route";
import { DELETE as deleteMe } from "@/app/api/v1/me/route";
import { POST as leaveCollege } from "@/app/api/v1/c/[slug]/me/leave/route";
import { GET as personProfile } from "@/app/api/v1/c/[slug]/people/[userId]/route";
import { GET as myMemberships } from "@/app/api/v1/me/memberships/route";
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

// Expectation builders for the Day 4 rows.
const signedIn = (status: number): Record<Principal, Expected> =>
  Object.fromEntries(allPrincipals.map((p) => [p, p === "anon" ? 401 : status])) as Record<
    Principal,
    Expected
  >;
// An endpoint for active members of Alpha: pending and suspended are 403, another college is 404.
const memberOnly = (ok: number): Record<Principal, Expected> => ({
  anon: 401,
  pending: 403,
  suspended: 403,
  student_l1: ok,
  student_l2: ok,
  moderator: ok,
  admin: ok,
  other_college_student: 404,
  other_college_admin: 404,
});
// An endpoint for the college admin only: students and moderators are 403.
const adminOnly = (ok: number): Record<Principal, Expected> => ({
  ...modOnly(ok),
  moderator: 403,
});
// An endpoint for moderators and admins of Alpha: students are 403.
const modOnly = (ok: number): Record<Principal, Expected> => ({
  ...memberOnly(ok),
  student_l1: 403,
  student_l2: 403,
});

const endpoints: { op: string; call: Call; expect: Record<Principal, Expected> }[] = [
  {
    op: "APP-01 POST /me/applications (any signed in person, private)",
    call: (cookie) =>
      call(createApplication, {
        method: "POST",
        path: "/api/v1/me/applications",
        json: { company: "Matrix Co", role_title: "Tester" },
        cookie,
        headers: idem(),
      }).then((r) => r.status),
    expect: signedIn(201),
  },
  {
    op: "APP-02 GET /me/applications (any signed in person, own rows only)",
    call: (cookie) =>
      call(listApplications, { path: "/api/v1/me/applications", cookie }).then((r) => r.status),
    expect: signedIn(200),
  },
  {
    op: "APP-03 GET /me/applications/{id} (someone else's or unknown id is 404)",
    call: (cookie) => {
      const id = randomUUID();
      return call(getApplication, {
        path: `/api/v1/me/applications/${id}`,
        params: { id },
        cookie,
      }).then((r) => r.status);
    },
    expect: signedIn(404),
  },
  {
    op: "APP-03 PATCH /me/applications/{id} (someone else's or unknown id is 404)",
    call: (cookie) => {
      const id = randomUUID();
      return call(patchApplication, {
        method: "PATCH",
        path: `/api/v1/me/applications/${id}`,
        json: { notes: "x" },
        params: { id },
        cookie,
      }).then((r) => r.status);
    },
    expect: signedIn(404),
  },
  {
    op: "APP-03 DELETE /me/applications/{id} (someone else's or unknown id is 404)",
    call: (cookie) => {
      const id = randomUUID();
      return call(deleteApplication, {
        method: "DELETE",
        path: `/api/v1/me/applications/${id}`,
        params: { id },
        cookie,
      }).then((r) => r.status);
    },
    expect: signedIn(404),
  },
  {
    op: "APP-04 POST /me/applications/{id}/status (someone else's or unknown id is 404)",
    call: (cookie) => {
      const id = randomUUID();
      return call(changeApplicationStatus, {
        method: "POST",
        path: `/api/v1/me/applications/${id}/status`,
        json: { status: "applied" },
        params: { id },
        cookie,
      }).then((r) => r.status);
    },
    expect: signedIn(404),
  },
  {
    op: "AUTH-05 GET /auth/google (public: always a redirect, to Google or back to sign in)",
    call: (cookie) =>
      call(googleStart, { path: "/api/v1/auth/google", cookie }).then((r) => r.status),
    expect: Object.fromEntries(allPrincipals.map((p) => [p, 302])) as Record<Principal, Expected>,
  },
  {
    op: "AUTH-06 GET /auth/google/callback (public: without a code it goes back to sign in)",
    call: (cookie) =>
      call(googleCallback, { path: "/api/v1/auth/google/callback", cookie }).then((r) => r.status),
    expect: Object.fromEntries(allPrincipals.map((p) => [p, 302])) as Record<Principal, Expected>,
  },
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
  {
    op: "NTF-01 GET /me/notifications (any signed-in user, own rows only)",
    call: (cookie) =>
      call(myNotifications, { path: "/api/v1/me/notifications", cookie }).then((r) => r.status),
    expect: signedIn(200),
  },
  {
    op: "NTF-02 POST /me/notifications/read (own rows only; an unknown id changes nothing)",
    call: (cookie) =>
      call(readNotifications, {
        method: "POST",
        path: "/api/v1/me/notifications/read",
        json: { ids: [randomUUID()] },
        cookie,
      }).then((r) => r.status),
    expect: signedIn(200),
  },
  {
    op: "RPT-04 PUT /me/blocks/{stranger} (no such classmate -> 404 for everyone signed in)",
    call: (cookie) => {
      const userId = randomUUID();
      return call(blockUser, {
        method: "PUT",
        path: `/api/v1/me/blocks/${userId}`,
        params: { userId },
        cookie,
      }).then((r) => r.status);
    },
    expect: signedIn(404),
  },
  {
    op: "WL-01 POST /waitlist (public; an empty body is the probe, 400 for everyone)",
    call: (cookie) =>
      call(waitlist, { method: "POST", path: "/api/v1/waitlist", json: {}, cookie }).then(
        (r) => r.status,
      ),
    expect: Object.fromEntries(allPrincipals.map((p) => [p, 400])) as Record<Principal, Expected>,
  },
  {
    op: "ANN-01 GET /c/alpha/announcements (members)",
    call: (cookie) =>
      call(announcementsList, {
        path: "/api/v1/c/alpha/announcements",
        params: { slug: "alpha" },
        cookie,
      }).then((r) => r.status),
    expect: { ...memberOnly(200), anon: 401 },
  },
  {
    op: "RPT-01 POST /c/alpha/reports (members; a target that does not exist is the probe -> 404)",
    call: (cookie) =>
      call(fileReport, {
        method: "POST",
        path: "/api/v1/c/alpha/reports",
        json: { target_type: "announcement", target_id: randomUUID(), reason: "spam" },
        params: { slug: "alpha" },
        cookie,
        headers: idem(),
      }).then((r) => r.status),
    expect: memberOnly(404),
  },
  ...(
    [
      ["ANN-02 GET /admin/announcements (moderators)", modAnnouncements, "announcements"],
      ["RPT-02 GET /admin/reports (moderators)", modReports, "reports"],
    ] as const
  ).map(([op, handler, path]) => ({
    op,
    call: (cookie: string | undefined) =>
      call(handler, {
        path: `/api/v1/c/alpha/admin/${path}`,
        params: { slug: "alpha" },
        cookie,
      }).then((r) => r.status),
    expect: modOnly(200),
  })),
  {
    op: "PRF-01 GET /me/profile (own profile, any signed-in user)",
    call: (cookie) => call(myProfile, { path: "/api/v1/me/profile", cookie }).then((r) => r.status),
    expect: signedIn(200),
  },
  {
    op: "PRF-01 PATCH /me/profile (an unknown field is the probe -> 400)",
    call: (cookie) =>
      call(patchProfile, {
        method: "PATCH",
        path: "/api/v1/me/profile",
        json: { not_a_field: true },
        cookie,
      }).then((r) => r.status),
    expect: signedIn(400),
  },
  {
    op: "PRF-02 GET /me/skills (own skills)",
    call: (cookie) => call(mySkills, { path: "/api/v1/me/skills", cookie }).then((r) => r.status),
    expect: signedIn(200),
  },
  {
    op: "PRF-02 PUT /me/skills (an empty body is the probe -> 400)",
    call: (cookie) =>
      call(putSkills, { method: "PUT", path: "/api/v1/me/skills", json: {}, cookie }).then(
        (r) => r.status,
      ),
    expect: signedIn(400),
  },
  {
    op: "PRF-03 GET /skills (skill autocomplete)",
    call: (cookie) =>
      call(skillSearch, { path: "/api/v1/skills?q=py", cookie }).then((r) => r.status),
    expect: signedIn(200),
  },
  {
    op: "PRF-04 POST /me/avatar (an empty file is the probe -> 400)",
    call: (cookie) =>
      call(uploadAvatar, { method: "POST", path: "/api/v1/me/avatar", cookie }).then(
        (r) => r.status,
      ),
    expect: signedIn(400),
  },
  {
    op: "PRF-04 POST /me/avatar/upload-url (an empty body is the probe -> 400)",
    call: (cookie) =>
      call(avatarUploadUrl, {
        method: "POST",
        path: "/api/v1/me/avatar/upload-url",
        json: {},
        cookie,
      }).then((r) => r.status),
    expect: signedIn(400),
  },
  {
    op: "PRF-05 GET /c/alpha/people (members)",
    call: (cookie) =>
      call(peopleList, {
        path: "/api/v1/c/alpha/people",
        params: { slug: "alpha" },
        cookie,
      }).then((r) => r.status),
    expect: memberOnly(200),
  },
  {
    op: "TMF-02 GET /c/alpha/team-posts (members)",
    call: (cookie) =>
      call(tmfList, {
        path: "/api/v1/c/alpha/team-posts",
        params: { slug: "alpha" },
        cookie,
      }).then((r) => r.status),
    expect: memberOnly(200),
  },
  {
    op: "TMF-10 GET /c/alpha/me/join-requests (members)",
    call: (cookie) =>
      call(tmfMine, {
        path: "/api/v1/c/alpha/me/join-requests",
        params: { slug: "alpha" },
        cookie,
      }).then((r) => r.status),
    expect: memberOnly(200),
  },
  {
    op: "TMF-01 POST /c/alpha/team-posts (an empty body is the probe -> 400 for members)",
    call: (cookie) =>
      call(tmfCreate, {
        method: "POST",
        path: "/api/v1/c/alpha/team-posts",
        json: {},
        params: { slug: "alpha" },
        cookie,
        headers: idem(),
      }).then((r) => r.status),
    expect: memberOnly(400),
  },
  ...(
    [
      [
        "TMF-03 GET /c/alpha/team-posts/{id} (unknown post is the probe -> 404 for members)",
        tmfGet,
        "GET",
        undefined,
        "",
      ],
      [
        "TMF-04 PATCH /c/alpha/team-posts/{id} (unknown post -> 404 for members)",
        tmfPatch,
        "PATCH",
        { title: "Some new title" },
        "",
      ],
      [
        "TMF-05 POST /c/alpha/team-posts/{id}/close (unknown post -> 404 for members)",
        tmfClose,
        "POST",
        undefined,
        "/close",
      ],
      [
        "TMF-07 GET /c/alpha/team-posts/{id}/requests (unknown post -> 404 for members)",
        tmfRequests,
        "GET",
        undefined,
        "/requests",
      ],
    ] as const
  ).map(([op, handler, method, json, tail]) => ({
    op,
    call: (cookie: string | undefined) => {
      const id = randomUUID();
      return call(handler, {
        method,
        path: `/api/v1/c/alpha/team-posts/${id}${tail}`,
        json,
        params: { slug: "alpha", id },
        cookie,
      }).then((r) => r.status);
    },
    expect: memberOnly(404),
  })),
  {
    op: "TMF-06 POST /c/alpha/team-posts/{id}/roles/{roleId}/requests (unknown post -> 404 for members)",
    call: (cookie) => {
      const id = randomUUID();
      const roleId = randomUUID();
      return call(tmfRequest, {
        method: "POST",
        path: `/api/v1/c/alpha/team-posts/${id}/roles/${roleId}/requests`,
        json: {},
        params: { slug: "alpha", id, roleId },
        cookie,
        headers: idem(),
      }).then((r) => r.status);
    },
    expect: memberOnly(404),
  },
  {
    op: "TMF-08 POST /c/alpha/join-requests/{id}/decision (unknown request -> 404 for members)",
    call: (cookie) => {
      const id = randomUUID();
      return call(tmfDecision, {
        method: "POST",
        path: `/api/v1/c/alpha/join-requests/${id}/decision`,
        json: { decision: "accepted" },
        params: { slug: "alpha", id },
        cookie,
        headers: idem(),
      }).then((r) => r.status);
    },
    expect: memberOnly(404),
  },
  {
    op: "TMF-09 DELETE /c/alpha/join-requests/{id} (unknown request -> 404 for members)",
    call: (cookie) => {
      const id = randomUUID();
      return call(tmfWithdraw, {
        method: "DELETE",
        path: `/api/v1/c/alpha/join-requests/${id}`,
        params: { slug: "alpha", id },
        cookie,
      }).then((r) => r.status);
    },
    expect: memberOnly(404),
  },
  {
    op: "OPP-01 GET /c/alpha/opportunities (members)",
    call: (cookie) =>
      call(oppList, {
        path: "/api/v1/c/alpha/opportunities",
        params: { slug: "alpha" },
        cookie,
      }).then((r) => r.status),
    expect: memberOnly(200),
  },
  {
    op: "OPP-02 GET /c/alpha/opportunities/{id} (unknown id is the probe -> 404 for members)",
    call: (cookie) => {
      const id = randomUUID();
      return call(oppGet, {
        path: `/api/v1/c/alpha/opportunities/${id}`,
        params: { slug: "alpha", id },
        cookie,
      }).then((r) => r.status);
    },
    expect: memberOnly(404),
  },
  {
    op: "OPP-03 GET /c/alpha/admin/opportunities (moderators)",
    call: (cookie) =>
      call(oppAdminList, {
        path: "/api/v1/c/alpha/admin/opportunities",
        params: { slug: "alpha" },
        cookie,
      }).then((r) => r.status),
    expect: modOnly(200),
  },
  {
    op: "OPP-03 POST /c/alpha/admin/opportunities (an empty body is the probe -> 400 for moderators)",
    call: (cookie) =>
      call(oppCreate, {
        method: "POST",
        path: "/api/v1/c/alpha/admin/opportunities",
        json: {},
        params: { slug: "alpha" },
        cookie,
        headers: idem(),
      }).then((r) => r.status),
    expect: modOnly(400),
  },
  ...(
    [
      ["PATCH", oppPatch, { title: "Some new title" }],
      ["DELETE", oppRemove, undefined],
    ] as const
  ).map(([method, handler, json]) => ({
    op: `OPP-03 ${method} /c/alpha/admin/opportunities/{id} (unknown id -> 404 for moderators)`,
    call: (cookie: string | undefined) => {
      const id = randomUUID();
      return call(handler, {
        method,
        path: `/api/v1/c/alpha/admin/opportunities/${id}`,
        json,
        params: { slug: "alpha", id },
        cookie,
      }).then((r) => r.status);
    },
    expect: modOnly(404),
  })),
  ...(
    [
      ["PUT", oppSave],
      ["DELETE", oppUnsave],
    ] as const
  ).map(([method, handler]) => ({
    op: `OPP-04 ${method} /me/saved-opportunities/{id} (unknown id -> 404 for everyone signed in)`,
    call: (cookie: string | undefined) => {
      const id = randomUUID();
      return call(handler, {
        method,
        path: `/api/v1/me/saved-opportunities/${id}`,
        params: { id },
        cookie,
      }).then((r) => r.status);
    },
    expect: signedIn(404),
  })),
  {
    op: "REM-01 GET /me/reminder-settings (own setting)",
    call: (cookie) =>
      call(remGet, { path: "/api/v1/me/reminder-settings", cookie }).then((r) => r.status),
    expect: signedIn(200),
  },
  {
    op: "REM-01 PUT /me/reminder-settings (an empty body is the probe -> 400)",
    call: (cookie) =>
      call(remPut, {
        method: "PUT",
        path: "/api/v1/me/reminder-settings",
        json: {},
        cookie,
      }).then((r) => r.status),
    expect: signedIn(400),
  },
  {
    op: "AUTH-04 DELETE /me (an invalid code is the probe -> 400; nothing is sent or deleted)",
    call: (cookie) =>
      call(deleteMe, { method: "DELETE", path: "/api/v1/me", json: { code: "x" }, cookie }).then(
        (r) => r.status,
      ),
    expect: signedIn(400),
  },
  {
    op: "TEN-07 POST /c/{slug}/me/leave (a college nobody joined is the probe -> 404 for everyone signed in)",
    call: (cookie) =>
      call(leaveCollege, {
        method: "POST",
        path: "/api/v1/c/no-such-college-xyz/me/leave",
        params: { slug: "no-such-college-xyz" },
        cookie,
      }).then((r) => r.status),
    expect: signedIn(404),
  },
  {
    op: "PRF-06 GET /c/alpha/people/{userId} (unknown person is the probe -> 404 for members)",
    call: (cookie) => {
      const userId = randomUUID();
      return call(personProfile, {
        path: `/api/v1/c/alpha/people/${userId}`,
        params: { slug: "alpha", userId },
        cookie,
      }).then((r) => r.status);
    },
    expect: memberOnly(404),
  },
  {
    op: "TEN-09 POST /c/alpha/join/open (the open method is only for Global: signed in people get 403 in Alpha)",
    call: (cookie) =>
      call(joinOpen, {
        method: "POST",
        path: "/api/v1/c/alpha/join/open",
        json: {},
        params: { slug: "alpha" },
        cookie,
        headers: idem(),
      }).then((r) => r.status),
    expect: signedIn(403),
  },
  {
    op: "TEN-08 GET /me/memberships (any signed-in user, own rows only)",
    call: (cookie) =>
      call(myMemberships, { path: "/api/v1/me/memberships", cookie }).then((r) => r.status),
    expect: signedIn(200),
  },
  {
    op: "RPT-03 POST /admin/reports/{id}/action (moderators; an unknown report is the probe -> 404)",
    call: (cookie) => {
      const id = randomUUID();
      return call(actOnReport, {
        method: "POST",
        path: `/api/v1/c/alpha/admin/reports/${id}/action`,
        json: { action: "dismiss" },
        params: { slug: "alpha", id },
        cookie,
        headers: idem(),
      }).then((r) => r.status);
    },
    expect: modOnly(404),
  },
  {
    op: "SYS-01 GET /api/health (public)",
    call: (cookie) => call(health, { path: "/api/health", cookie }).then((r) => r.status),
    expect: Object.fromEntries(allPrincipals.map((p) => [p, 200])) as Record<Principal, Expected>,
  },
  {
    op: "SYS-02 POST /api/internal/maintenance (cron secret only; a person, even an admin, gets 401)",
    call: (cookie) =>
      call(maintenance, { method: "POST", path: "/api/internal/maintenance", cookie }).then(
        (r) => r.status,
      ),
    expect: Object.fromEntries(allPrincipals.map((p) => [p, 401])) as Record<Principal, Expected>,
  },
  {
    op: "SYS-01 GET /api/ready (public)",
    call: (cookie) => call(ready, { path: "/api/ready", cookie }).then((r) => r.status),
    expect: Object.fromEntries(allPrincipals.map((p) => [p, 200])) as Record<Principal, Expected>,
  },
  ...(
    [
      [
        "AUTH-01 POST /auth/otp/request (public; an empty body is the probe)",
        otpRequest,
        "request",
      ],
      ["AUTH-02 POST /auth/otp/verify (public; an empty body is the probe)", otpVerify, "verify"],
    ] as const
  ).map(([op, handler, path]) => ({
    op,
    call: (cookie: string | undefined) =>
      call(handler, {
        method: "POST",
        path: `/api/v1/auth/otp/${path}`,
        json: {},
        cookie,
      }).then((r) => r.status),
    expect: Object.fromEntries(allPrincipals.map((p) => [p, 400])) as Record<Principal, Expected>,
  })),
  {
    op: "RPT-04 DELETE /me/blocks/{stranger} (nothing to remove -> 200 for everyone signed in)",
    call: (cookie) => {
      const userId = randomUUID();
      return call(unblockUser, {
        method: "DELETE",
        path: `/api/v1/me/blocks/${userId}`,
        params: { userId },
        cookie,
      }).then((r) => r.status);
    },
    expect: signedIn(200),
  },
  {
    op: "ADM-03 PATCH /admin/settings (empty patch is the probe -> 400 for the admin)",
    call: (cookie) =>
      call(patchSettings, {
        method: "PATCH",
        path: "/api/v1/c/alpha/admin/settings",
        json: {},
        params: { slug: "alpha" },
        cookie,
      }).then((r) => r.status),
    expect: adminOnly(400),
  },
  {
    op: "ADM-05 POST /admin/invites (empty body is the probe -> 400 for the admin)",
    call: (cookie) =>
      call(createInvite, {
        method: "POST",
        path: "/api/v1/c/alpha/admin/invites",
        json: {},
        params: { slug: "alpha" },
        cookie,
        headers: idem(),
      }).then((r) => r.status),
    expect: adminOnly(400),
  },
  {
    op: "ADM-05 DELETE /admin/invites/{id} (unknown invite is the probe -> 404 for the admin)",
    call: (cookie) => {
      const id = randomUUID();
      return call(revokeInvite, {
        method: "DELETE",
        path: `/api/v1/c/alpha/admin/invites/${id}`,
        params: { slug: "alpha", id },
        cookie,
      }).then((r) => r.status);
    },
    expect: adminOnly(404),
  },
  {
    op: "ADM-07 POST /admin/verification-requests/{id}/decision (unknown request -> 404 for the admin)",
    call: (cookie) => {
      const id = randomUUID();
      return call(decideRequest, {
        method: "POST",
        path: `/api/v1/c/alpha/admin/verification-requests/${id}/decision`,
        json: { decision: "approved" },
        params: { slug: "alpha", id },
        cookie,
        headers: idem(),
      }).then((r) => r.status);
    },
    expect: adminOnly(404),
  },
  {
    op: "ADM-09 PATCH /admin/members/{membershipId} (unknown member -> 404 for the admin)",
    call: (cookie) => {
      const membershipId = randomUUID();
      return call(patchMember, {
        method: "PATCH",
        path: `/api/v1/c/alpha/admin/members/${membershipId}`,
        json: { role: "student" },
        params: { slug: "alpha", membershipId },
        cookie,
      }).then((r) => r.status);
    },
    expect: adminOnly(404),
  },
  {
    op: "ANN-02 POST /admin/announcements (empty body is the probe -> 400 for moderators)",
    call: (cookie) =>
      call(postAnnouncement, {
        method: "POST",
        path: "/api/v1/c/alpha/admin/announcements",
        json: {},
        params: { slug: "alpha" },
        cookie,
        headers: idem(),
      }).then((r) => r.status),
    expect: modOnly(400),
  },
  ...(
    [
      ["PATCH", patchAnnouncement, { pinned: true }],
      ["DELETE", deleteAnnouncement, undefined],
    ] as const
  ).map(([method, handler, json]) => ({
    op: `ANN-02 ${method} /admin/announcements/{id} (unknown announcement -> 404 for moderators)`,
    call: (cookie: string | undefined) => {
      const id = randomUUID();
      return call(handler, {
        method,
        path: `/api/v1/c/alpha/admin/announcements/${id}`,
        json,
        params: { slug: "alpha", id },
        cookie,
      }).then((r) => r.status);
    },
    expect: modOnly(404),
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

// ---------------------------------------------------------------------------
// 3. docs/PERMISSIONS.md must list every route method, and the matrix must call every row
// ---------------------------------------------------------------------------
function routeFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return routeFiles(full);
    return name === "route.ts" ? [full] : [];
  });
}

describe("docs/PERMISSIONS.md matches the code and the matrix", () => {
  const root = join(__dirname, "..", "..");
  const apiRoot = join(root, "src", "app", "api");
  const fromCode = routeFiles(apiRoot)
    .flatMap((file) => {
      const path = file
        .slice(apiRoot.length)
        .replace(/\\/g, "/")
        .replace(/\/route\.ts$/, "")
        .replace(/\[(\w+)\]/g, "{$1}");
      const source = readFileSync(file, "utf8");
      return [
        ...source.matchAll(/export (?:async )?(?:function|const) (GET|POST|PUT|PATCH|DELETE)\b/g),
      ].map((m) => `${m[1]} ${path.startsWith("/v1/") ? path.slice(3) : `/api${path}`}`);
    })
    .sort();
  const doc = readFileSync(join(root, "docs", "PERMISSIONS.md"), "utf8");
  const rows = [
    ...doc.matchAll(/^\| ([A-Z]+-\d+) \| (GET|POST|PUT|PATCH|DELETE) \| (\S+) \|/gm),
  ].map((m) => ({ id: m[1], method: m[2], path: m[3] }));

  it("lists exactly the route methods that exist", () => {
    expect(rows.map((r) => `${r.method} ${r.path}`).sort()).toEqual(fromCode);
  });

  it("has a call in the matrix for every row", () => {
    const missing = rows.filter(
      (r) => !endpoints.some((e) => e.op.startsWith(`${r.id} ${r.method} `)),
    );
    expect(missing).toEqual([]);
  });
});
