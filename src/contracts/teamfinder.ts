import { z } from "zod";
import { httpsUrl, isoDateTime, paginationQuery, successEnvelope, uuid } from "./common";

// ---------------------------------------------------------------------------
// Team Finder (TMF-01 to TMF-10). Rules: docs/API_CONTRACT.md section 10.
// ---------------------------------------------------------------------------
export const teamPostKind = z.enum(["project", "startup", "hackathon", "competition"]);
// `expired` is worked out from the deadline: an open post past its deadline is shown as expired.
export const teamPostStatus = z.enum(["open", "closed", "filled", "expired"]);
export const joinRequestStatus = z.enum([
  "pending",
  "accepted",
  "declined",
  "withdrawn",
  "cancelled",
]);

// TMF-01 POST /api/v1/c/{slug}/team-posts (IDEM)
export const teamRoleInput = z.strictObject({
  role_name: z.string().trim().min(1).max(60),
  slots: z.number().int().min(1).max(20),
  skill_ids: z.array(uuid).max(10).default([]),
});
export const teamPostCreateBody = z.strictObject({
  kind: teamPostKind,
  title: z.string().trim().min(5).max(120),
  description: z.string().trim().max(3000).default(""),
  // A future date within 180 days. Leave out for no deadline.
  deadline: isoDateTime.nullable().optional(),
  external_link: httpsUrl.optional(),
  // Shown only to the author and to accepted members.
  team_link: httpsUrl.optional(),
  roles: z.array(teamRoleInput).min(1).max(8),
});

// TMF-04 PATCH /api/v1/c/{slug}/team-posts/{id}. Only the keys you send change. null clears a link or the deadline.
export const teamPostPatchBody = z
  .strictObject({
    kind: teamPostKind.optional(),
    title: z.string().trim().min(5).max(120).optional(),
    description: z.string().trim().max(3000).optional(),
    deadline: isoDateTime.nullable().optional(),
    external_link: httpsUrl.nullable().optional(),
    team_link: httpsUrl.nullable().optional(),
  })
  .refine((body) => Object.keys(body).length > 0, { message: "Send at least one field to change" });

export const teamRole = z.object({
  id: uuid,
  role_name: z.string(),
  slots: z.number().int(),
  filled: z.number().int(),
  // Skill names (for chips) and ids (for filters).
  skills: z.array(z.string()),
  skill_ids: z.array(uuid),
});

export const teamPost = z.object({
  id: uuid,
  kind: teamPostKind,
  title: z.string(),
  description: z.string(),
  status: teamPostStatus,
  deadline: isoDateTime.nullable(),
  external_link: z.string().nullable(),
  created_at: isoDateTime,
  is_owner: z.boolean(),
  author: z.object({ user_id: uuid, display_name: z.string() }),
  roles: z.array(teamRole),
  // My own requests on this post (so the screen can show "Requested" or "Accepted").
  my_requests: z.array(z.object({ id: uuid, role_id: uuid, status: joinRequestStatus })),
});
export const teamPostDetail = teamPost.extend({
  // null unless you are the author or an accepted member.
  team_link: z.string().nullable(),
  // only for the author
  pending_requests: z.number().int().min(0).optional(),
});
export const teamPostResponse = successEnvelope(teamPostDetail);

// TMF-02 GET /api/v1/c/{slug}/team-posts?kind=&status=open&skill=&q=&mine=true&limit=&cursor=
export const teamPostListQuery = paginationQuery.extend({
  kind: teamPostKind.optional(),
  status: z.enum(["open", "closed", "filled", "expired", "all"]).default("open"),
  skill: uuid.optional(),
  q: z.string().trim().min(1).max(80).optional(),
  mine: z.enum(["true", "false"]).optional(),
});
export const teamPostListResponse = successEnvelope(z.array(teamPost));

// TMF-06 POST /api/v1/c/{slug}/team-posts/{id}/roles/{role_id}/requests (IDEM)
export const joinRequestBody = z.strictObject({ message: z.string().trim().max(500).default("") });
export const joinRequestCreateResponse = successEnvelope(
  z.object({
    id: uuid,
    post_id: uuid,
    role_id: uuid,
    status: joinRequestStatus,
    message: z.string(),
    created_at: isoDateTime,
  }),
);

// TMF-07 GET /api/v1/c/{slug}/team-posts/{id}/requests?status=pending
export const joinRequestListQuery = paginationQuery.extend({
  status: joinRequestStatus.optional(),
});
export const joinRequestItem = z.object({
  id: uuid,
  role_id: uuid,
  role_name: z.string(),
  status: joinRequestStatus,
  message: z.string(),
  created_at: isoDateTime,
  decided_at: isoDateTime.nullable(),
  decision_note: z.string().nullable(),
  // No email address. Contact happens through the team link after acceptance.
  applicant: z.object({
    user_id: uuid,
    display_name: z.string(),
    headline: z.string().nullable(),
    skills: z.array(z.string()),
  }),
});
export const joinRequestListResponse = successEnvelope(z.array(joinRequestItem));

// TMF-08 POST /api/v1/c/{slug}/join-requests/{id}/decision (IDEM)
export const joinRequestDecisionBody = z.strictObject({
  decision: z.enum(["accepted", "declined"]),
  note: z.string().trim().max(500).optional(),
});
export const joinRequestDecisionResponse = successEnvelope(
  z.object({
    request: z.object({ id: uuid, status: joinRequestStatus }),
    role: z.object({ id: uuid, slots: z.number().int(), filled: z.number().int() }),
  }),
);

// TMF-09 DELETE /api/v1/c/{slug}/join-requests/{id}
export const joinRequestWithdrawResponse = successEnvelope(
  z.object({ id: uuid, status: z.literal("withdrawn") }),
);

// TMF-10 GET /api/v1/c/{slug}/me/join-requests?status=&limit=&cursor=  (my own requests)
export const myJoinRequestItem = z.object({
  id: uuid,
  status: joinRequestStatus,
  message: z.string(),
  created_at: isoDateTime,
  decided_at: isoDateTime.nullable(),
  decision_note: z.string().nullable(),
  post: z.object({ id: uuid, title: z.string(), kind: teamPostKind, status: teamPostStatus }),
  role: z.object({ id: uuid, role_name: z.string() }),
});
export const myJoinRequestListResponse = successEnvelope(z.array(myJoinRequestItem));
