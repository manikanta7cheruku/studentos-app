import type { ZodType } from "zod";
import * as admin from "./admin";
import * as applications from "./applications";
import * as auth from "./auth";
import * as common from "./common";
import * as engagement from "./engagement";
import * as ideas from "./ideas";
import * as opportunities from "./opportunities";
import * as profile from "./profile";
import * as setup from "./setup";
import * as teamfinder from "./teamfinder";
import * as tenant from "./tenant";

// One line for every API route method: its id, path, who may call it, and the shapes it takes and gives.
// This is the single list that docs/openapi.v1.json is generated from. Two tests keep it honest
// (src/contracts/registry.test.ts): it must list exactly the routes in docs/PERMISSIONS.md with the same "who",
// and the committed docs/openapi.v1.json must equal what this file produces.
//
// who: pub = nobody signed in needed, ses = any signed-in person, mem = active member of the college,
//      mod = moderator or admin, adm = college admin, cron = the scheduler with the shared secret.
export type Who = "pub" | "ses" | "mem" | "mod" | "adm" | "cron";

export type Endpoint = {
  id: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  // Under /api/v1, except the ones that start with /api/.
  path: string;
  who: Who;
  summary: string;
  query?: ZodType;
  body?: ZodType;
  response?: ZodType;
  // The status of a good answer (200 unless given).
  status?: number;
  // Needs an Idempotency-Key header.
  idem?: boolean;
};

const e = (
  id: string,
  method: Endpoint["method"],
  path: string,
  who: Who,
  summary: string,
  extra: Partial<Endpoint> = {},
): Endpoint => ({ id, method, path, who, summary, ...extra });

const { paginationQuery } = common;

export const endpoints: Endpoint[] = [
  e("SYS-01", "GET", "/api/health", "pub", "Is the app running? No database call"),
  e("SYS-01", "GET", "/api/ready", "pub", "Can the app reach its database?"),
  e(
    "SYS-02",
    "POST",
    "/api/internal/maintenance",
    "cron",
    "Scheduler only: expire old things, send reminders, delete old rows",
  ),

  e("AUTH-01", "POST", "/auth/otp/request", "pub", "Send a sign in code by email", {
    body: auth.otpRequestBody,
    response: auth.otpRequestResponse,
  }),
  e("AUTH-02", "POST", "/auth/otp/verify", "pub", "Exchange the code for a session (cookies)", {
    body: auth.otpVerifyBody,
    response: auth.otpVerifyResponse,
  }),
  e(
    "AUTH-04",
    "DELETE",
    "/me",
    "ses",
    "Delete my account in two steps (email a code, then confirm with it)",
    { body: auth.deleteMeBody, response: auth.deleteMeResponse },
  ),
  e("AUTH-05", "GET", "/auth/google", "pub", "Start Continue with Google (redirects to Google)", {
    status: 302,
  }),
  e(
    "AUTH-06",
    "GET",
    "/auth/google/callback",
    "pub",
    "Google sends the person back here; sets the session cookies",
    {
      status: 302,
    },
  ),
  e("AUTH-03", "POST", "/auth/logout", "ses", "End this session, or all with ?all=true", {
    query: auth.logoutQuery,
    response: auth.logoutResponse,
  }),

  e(
    "TEN-01",
    "GET",
    "/colleges/public/{slug}",
    "pub",
    "Public branding, join methods and which tabs are on",
    { response: tenant.publicCollegeResponse },
  ),
  e("TEN-08", "GET", "/me/memberships", "ses", "The colleges I belong to or asked to join", {
    response: tenant.myMembershipsResponse,
  }),
  e("TEN-02", "GET", "/c/{slug}/me/membership", "ses", "My membership status in this college", {
    response: tenant.myMembershipResponse,
  }),
  e("TEN-03", "POST", "/c/{slug}/join/invite", "ses", "Redeem an invite code", {
    body: tenant.joinInviteBody,
    response: tenant.joinInviteResponse,
    idem: true,
  }),
  e("TEN-09", "POST", "/c/{slug}/join/open", "ses", "Join the Global space (unverified, level 1)", {
    body: tenant.joinOpenBody,
    response: tenant.joinOpenResponse,
    idem: true,
  }),
  e("TEN-04", "POST", "/c/{slug}/join/manual", "ses", "Submit a manual verification request", {
    body: tenant.joinManualBody,
    response: tenant.joinManualResponse,
    idem: true,
  }),
  e(
    "TEN-05",
    "POST",
    "/c/{slug}/join/email-domain",
    "ses",
    "Start or complete college email verification",
    { body: tenant.joinEmailDomainBody, response: tenant.joinEmailDomainCompleteResponse },
  ),

  e("TEN-07", "POST", "/c/{slug}/me/leave", "ses", "Leave this college", {
    response: tenant.leaveResponse,
  }),
  e("NTF-01", "GET", "/me/notifications", "ses", "My notifications", {
    query: engagement.notificationListQuery,
    response: engagement.notificationListResponse,
  }),
  e("NTF-02", "POST", "/me/notifications/read", "ses", "Mark some or all as read", {
    body: engagement.notificationReadBody,
    response: engagement.notificationReadResponse,
  }),
  e("RPT-04", "PUT", "/me/blocks/{userId}", "ses", "Block a classmate", {
    response: engagement.blockResponse,
  }),
  e("RPT-04", "DELETE", "/me/blocks/{userId}", "ses", "Unblock a classmate", {
    response: engagement.blockResponse,
  }),
  e(
    "WL-01",
    "POST",
    "/waitlist",
    "pub",
    "Join the college waitlist (always answers joined: true)",
    { body: engagement.waitlistBody, response: engagement.waitlistResponse },
  ),

  e("PRF-01", "GET", "/me/profile", "ses", "My profile", { response: profile.profileResponse }),
  e("PRF-01", "PATCH", "/me/profile", "ses", "Change my profile", {
    body: profile.profilePatchBody,
    response: profile.profileResponse,
  }),
  e("PRF-02", "GET", "/me/skills", "ses", "My skills", { response: profile.skillsPutResponse }),
  e("PRF-02", "PUT", "/me/skills", "ses", "Replace my skills in one step", {
    body: profile.skillsPutBody,
    response: profile.skillsPutResponse,
  }),
  e("PRF-03", "GET", "/skills", "ses", "Skill autocomplete", {
    query: profile.skillSearchQuery,
    response: profile.skillSearchResponse,
  }),
  e("PRF-04", "POST", "/me/avatar", "ses", "Upload an avatar (the image as the body, up to 2 MB)", {
    response: profile.avatarUploadResponse,
  }),
  e("PRF-04", "POST", "/me/avatar/upload-url", "ses", "Get a signed link to upload an avatar", {
    body: profile.avatarUploadUrlBody,
    response: profile.avatarUploadUrlResponse,
  }),
  e("PRF-05", "GET", "/c/{slug}/people", "mem", "Directory of visible classmates (?q=)"),

  e("PRF-06", "GET", "/c/{slug}/people/{userId}", "mem", "One classmate's profile", {
    response: profile.personProfileResponse,
  }),

  e("TMF-01", "POST", "/c/{slug}/team-posts", "mem", "Create a team post with roles", {
    body: teamfinder.teamPostCreateBody,
    response: teamfinder.teamPostResponse,
    status: 201,
    idem: true,
  }),
  e("TMF-02", "GET", "/c/{slug}/team-posts", "mem", "List and filter team posts", {
    query: teamfinder.teamPostListQuery,
    response: teamfinder.teamPostListResponse,
  }),
  e("TMF-03", "GET", "/c/{slug}/team-posts/{id}", "mem", "One team post", {
    response: teamfinder.teamPostResponse,
  }),
  e("TMF-04", "PATCH", "/c/{slug}/team-posts/{id}", "mem", "Edit my open team post", {
    body: teamfinder.teamPostPatchBody,
    response: teamfinder.teamPostResponse,
  }),
  e("TMF-05", "POST", "/c/{slug}/team-posts/{id}/close", "mem", "Close my team post", {
    response: teamfinder.teamPostResponse,
  }),
  e(
    "TMF-06",
    "POST",
    "/c/{slug}/team-posts/{id}/roles/{roleId}/requests",
    "mem",
    "Ask to join a role",
    {
      body: teamfinder.joinRequestBody,
      response: teamfinder.joinRequestCreateResponse,
      status: 201,
      idem: true,
    },
  ),
  e("TMF-07", "GET", "/c/{slug}/team-posts/{id}/requests", "mem", "Requests for my team post", {
    query: teamfinder.joinRequestListQuery,
    response: teamfinder.joinRequestListResponse,
  }),
  e(
    "TMF-08",
    "POST",
    "/c/{slug}/join-requests/{id}/decision",
    "mem",
    "Accept or decline a request",
    {
      body: teamfinder.joinRequestDecisionBody,
      response: teamfinder.joinRequestDecisionResponse,
      idem: true,
    },
  ),
  e("TMF-09", "DELETE", "/c/{slug}/join-requests/{id}", "mem", "Withdraw my request", {
    response: teamfinder.joinRequestWithdrawResponse,
  }),
  e("TMF-10", "GET", "/c/{slug}/me/join-requests", "mem", "My own requests", {
    query: teamfinder.joinRequestListQuery,
    response: teamfinder.myJoinRequestListResponse,
  }),

  e("OPP-01", "GET", "/c/{slug}/opportunities", "mem", "List and filter opportunities", {
    query: opportunities.opportunityListQuery,
    response: opportunities.opportunityListResponse,
  }),
  e("OPP-02", "GET", "/c/{slug}/opportunities/{id}", "mem", "One opportunity", {
    response: opportunities.opportunityResponse,
  }),
  e("OPP-03", "GET", "/c/{slug}/admin/opportunities", "mod", "All opportunities including drafts", {
    query: opportunities.adminOpportunityListQuery,
    response: opportunities.adminOpportunityListResponse,
  }),
  e("OPP-03", "POST", "/c/{slug}/admin/opportunities", "mod", "Create an opportunity", {
    body: opportunities.opportunityCreateBody,
    response: opportunities.opportunityResponse,
    status: 201,
    idem: true,
  }),
  e(
    "OPP-03",
    "PATCH",
    "/c/{slug}/admin/opportunities/{id}",
    "mod",
    "Edit or verify an opportunity",
    { body: opportunities.opportunityPatchBody, response: opportunities.opportunityResponse },
  ),
  e("OPP-03", "DELETE", "/c/{slug}/admin/opportunities/{id}", "mod", "Remove an opportunity", {
    response: opportunities.opportunityRemoveResponse,
  }),
  e("OPP-04", "PUT", "/me/saved-opportunities/{id}", "ses", "Save an opportunity", {
    response: opportunities.savedOpportunityResponse,
  }),
  e("OPP-04", "DELETE", "/me/saved-opportunities/{id}", "ses", "Unsave an opportunity", {
    response: opportunities.savedOpportunityResponse,
  }),
  e("IDE-01", "POST", "/c/{slug}/ideas", "mem", "Post an idea", {
    body: ideas.ideaCreateBody,
    response: ideas.ideaResponse,
    status: 201,
    idem: true,
  }),
  e("IDE-02", "GET", "/c/{slug}/ideas", "mem", "List ideas (new or top, by topic)", {
    query: ideas.ideaListQuery,
    response: ideas.ideaListResponse,
  }),
  e("IDE-03", "GET", "/c/{slug}/ideas/{id}", "mem", "One idea", {
    response: ideas.ideaResponse,
  }),
  e("IDE-04", "PUT", "/c/{slug}/ideas/{id}/vote", "mem", "Vote on an idea (1, -1 or 0)", {
    body: ideas.ideaVoteBody,
    response: ideas.ideaResponse,
  }),
  e("IDE-05", "DELETE", "/c/{slug}/ideas/{id}", "mem", "Remove an idea (author or moderator)", {
    response: ideas.ideaDeleteResponse,
  }),
  e("IDE-06", "POST", "/c/{slug}/ideas/{id}/comments", "mem", "Comment on an idea", {
    body: ideas.ideaCommentCreateBody,
    response: ideas.ideaCommentResponse,
    status: 201,
    idem: true,
  }),
  e("IDE-07", "GET", "/c/{slug}/ideas/{id}/comments", "mem", "Comments of an idea", {
    response: ideas.ideaCommentListResponse,
  }),
  e(
    "IDE-08",
    "DELETE",
    "/c/{slug}/ideas/{id}/comments/{commentId}",
    "mem",
    "Remove a comment (author or moderator)",
    { response: ideas.ideaDeleteResponse },
  ),
  e("COL-01", "POST", "/colleges/setup", "ses", "Create my college with a setup code", {
    body: setup.collegeSetupBody,
    response: setup.collegeSetupResponse,
    status: 201,
  }),
  e("APP-01", "POST", "/me/applications", "ses", "Add an application to my tracker", {
    body: applications.applicationCreateBody,
    response: applications.applicationResponse,
    status: 201,
    idem: true,
  }),
  e("APP-02", "GET", "/me/applications", "ses", "My applications (status, sort, search)", {
    query: applications.applicationListQuery,
    response: applications.applicationListResponse,
  }),
  e("APP-03", "GET", "/me/applications/{id}", "ses", "One application with its history", {
    response: applications.applicationResponse,
  }),
  e("APP-03", "PATCH", "/me/applications/{id}", "ses", "Edit an application (If-Match: version)", {
    body: applications.applicationPatchBody,
    response: applications.applicationResponse,
  }),
  e("APP-03", "DELETE", "/me/applications/{id}", "ses", "Delete an application", {
    response: applications.applicationDeleteResponse,
  }),
  e(
    "APP-04",
    "POST",
    "/me/applications/{id}/status",
    "ses",
    "Change the status (writes an event)",
    {
      body: applications.applicationStatusBody,
      response: applications.applicationResponse,
    },
  ),
  e("REM-01", "GET", "/me/reminder-settings", "ses", "Are deadline reminders on?", {
    response: opportunities.reminderSettingsResponse,
  }),
  e("REM-01", "PUT", "/me/reminder-settings", "ses", "Switch deadline reminders on or off", {
    body: opportunities.reminderSettingsBody,
    response: opportunities.reminderSettingsResponse,
  }),

  e("ANN-01", "GET", "/c/{slug}/announcements", "mem", "Announcements for members", {
    query: paginationQuery,
    response: engagement.announcementListResponse,
  }),
  e("RPT-01", "POST", "/c/{slug}/reports", "mem", "Report a profile, announcement or team post", {
    body: engagement.reportCreateBody,
    response: engagement.reportCreateResponse,
    status: 201,
    idem: true,
  }),
  e("ANN-02", "GET", "/c/{slug}/admin/announcements", "mod", "All announcements including drafts", {
    query: paginationQuery,
    response: engagement.adminAnnouncementListResponse,
  }),
  e("ANN-02", "POST", "/c/{slug}/admin/announcements", "mod", "Create an announcement", {
    body: engagement.announcementCreateBody,
    response: engagement.announcementResponse,
    status: 201,
    idem: true,
  }),
  e("ANN-02", "PATCH", "/c/{slug}/admin/announcements/{id}", "mod", "Edit an announcement", {
    body: engagement.announcementPatchBody,
    response: engagement.announcementResponse,
  }),
  e("ANN-02", "DELETE", "/c/{slug}/admin/announcements/{id}", "mod", "Remove an announcement", {
    response: engagement.announcementResponse,
  }),
  e("RPT-02", "GET", "/c/{slug}/admin/reports", "mod", "The report queue", {
    query: engagement.reportQueueQuery,
    response: engagement.reportQueueResponse,
  }),
  e(
    "RPT-03",
    "POST",
    "/c/{slug}/admin/reports/{id}/action",
    "mod",
    "Dismiss, hide, warn or suspend",
    { body: engagement.reportActionBody, response: engagement.reportActionResponse, idem: true },
  ),

  e("ADM-03", "GET", "/c/{slug}/admin/settings", "adm", "College settings", {
    response: admin.adminSettingsResponse,
  }),
  e("ADM-03", "PATCH", "/c/{slug}/admin/settings", "adm", "Change college settings", {
    body: admin.adminSettingsPatchBody,
    response: admin.adminSettingsResponse,
  }),
  e("ADM-11", "GET", "/c/{slug}/admin/stats", "adm", "Counts for the dashboard", {
    response: admin.adminStatsResponse,
  }),
  e("ADM-05", "GET", "/c/{slug}/admin/invites", "adm", "Invite codes", {
    response: admin.inviteListResponse,
  }),
  e("ADM-05", "POST", "/c/{slug}/admin/invites", "adm", "Create an invite code (shown once)", {
    body: admin.inviteCreateBody,
    response: admin.inviteCreateResponse,
    status: 201,
    idem: true,
  }),
  e("ADM-05", "DELETE", "/c/{slug}/admin/invites/{id}", "adm", "Revoke an invite code", {
    response: admin.inviteRevokeResponse,
  }),
  e(
    "ADM-06",
    "GET",
    "/c/{slug}/admin/verification-requests",
    "adm",
    "The queue of people waiting for approval",
    { query: admin.verificationRequestQuery, response: admin.verificationRequestListResponse },
  ),
  e(
    "ADM-07",
    "POST",
    "/c/{slug}/admin/verification-requests/{id}/decision",
    "adm",
    "Approve or reject a join request",
    {
      body: admin.verificationDecisionBody,
      response: admin.verificationDecisionResponse,
      idem: true,
    },
  ),
  e("ADM-08", "GET", "/c/{slug}/admin/members", "adm", "Members of the college", {
    query: admin.memberListQuery,
    response: admin.memberListResponse,
  }),
  e(
    "ADM-09",
    "PATCH",
    "/c/{slug}/admin/members/{membershipId}",
    "adm",
    "Change a member's role or status",
    { body: admin.memberPatchBody, response: admin.memberPatchResponse },
  ),
  e("ADM-10", "GET", "/c/{slug}/admin/audit-logs", "adm", "The audit log", {
    query: admin.auditLogQuery,
    response: admin.auditLogListResponse,
  }),
];
