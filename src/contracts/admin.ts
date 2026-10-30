import { z } from "zod";
import {
  isoDateTime,
  membershipRole,
  membershipStatus,
  paginationQuery,
  successEnvelope,
  uuid,
  verificationLevel,
  verificationMethod,
} from "./common";
import { membershipSummary } from "./tenant";

// ADM-03 GET / PATCH /api/v1/c/{slug}/admin/settings
export const adminSettings = z.object({
  allowed_methods: z.array(verificationMethod).min(1),
  require_admin_approval: z.boolean(),
  min_level_to_post: z.number().int().min(0).max(3),
  network_visibility: z.enum(["private", "read_shared", "full_shared"]),
  features: z.record(z.string(), z.boolean()),
  retention: z.record(z.string(), z.unknown()),
});
export const adminSettingsResponse = successEnvelope(adminSettings);
export const adminSettingsPatchBody = z
  .strictObject({
    allowed_methods: z.array(verificationMethod).min(1),
    require_admin_approval: z.boolean(),
    min_level_to_post: z.number().int().min(0).max(3),
    network_visibility: z.enum(["private", "read_shared", "full_shared"]),
    features: z.record(z.string(), z.boolean()),
    retention: z.record(z.string(), z.unknown()),
  })
  .partial()
  .refine((body) => Object.keys(body).length > 0, "Send at least one setting");

// ADM-05 POST / GET / DELETE /api/v1/c/{slug}/admin/invites (POST is IDEM)
export const inviteGrantsStatus = z.enum(["active", "pending"]);
export const inviteCreateBody = z.strictObject({
  label: z.string().trim().min(1).max(80),
  max_uses: z.number().int().min(1).max(1000),
  expires_at: isoDateTime,
  grants_status: inviteGrantsStatus,
});
export const invite = z.object({
  id: uuid,
  label: z.string(),
  max_uses: z.number().int().min(1),
  used_count: z.number().int().min(0),
  expires_at: isoDateTime,
  revoked_at: isoDateTime.nullable(),
  grants_status: inviteGrantsStatus,
  created_by: uuid,
  created_at: isoDateTime,
});
// The plain code is shown once, at creation. Only a hash is stored.
export const inviteCreateResponse = successEnvelope(
  z.object({ invite, code: z.string().regex(/^[A-Z0-9-]{6,32}$/) }),
);
export const inviteListResponse = successEnvelope(z.array(invite));
export const inviteRevokeResponse = successEnvelope(z.object({ invite }));

// ADM-06 GET /api/v1/c/{slug}/admin/verification-requests
export const verificationRequestStatus = z.enum([
  "pending",
  "approved",
  "rejected",
  "expired",
  "cancelled",
]);
export const verificationRequestQuery = paginationQuery.extend({
  status: verificationRequestStatus.optional(),
});
export const verificationRequest = z.object({
  id: uuid,
  membership_id: uuid,
  method: verificationMethod,
  status: verificationRequestStatus,
  applicant: z.object({
    user_id: uuid,
    display_name: z.string(),
    email: z.email(),
  }),
  submitted: z.object({
    program: z.string().nullable(),
    grad_year: z.number().int().nullable(),
    enrollment_last4: z.string().nullable(),
  }),
  created_at: isoDateTime,
  expires_at: isoDateTime.nullable(),
  decided_by: uuid.nullable(),
  decided_at: isoDateTime.nullable(),
  decision_reason: z.string().nullable(),
});
export const verificationRequestListResponse = successEnvelope(z.array(verificationRequest));

// ADM-07 POST /api/v1/c/{slug}/admin/verification-requests/{id}/decision (IDEM)
// Rejecting needs a reason of at least 5 characters. An admin cannot decide their own request (403).
export const verificationDecisionBody = z.discriminatedUnion("decision", [
  z.strictObject({
    decision: z.literal("approved"),
    note: z.string().trim().max(500).optional(),
  }),
  z.strictObject({
    decision: z.literal("rejected"),
    reason: z.string().trim().min(5).max(500),
  }),
]);
export const verificationDecisionResponse = successEnvelope(
  z.object({
    request: z.object({
      id: uuid,
      status: z.enum(["approved", "rejected"]),
      decided_by: uuid,
      decided_at: isoDateTime,
    }),
    membership: membershipSummary,
  }),
);

// ADM-08 GET /api/v1/c/{slug}/admin/members
export const memberListQuery = paginationQuery.extend({
  q: z.string().trim().min(1).max(80).optional(),
  status: membershipStatus.optional(),
  role: membershipRole.optional(),
});
export const adminMember = z.object({
  membership_id: uuid,
  user_id: uuid,
  display_name: z.string(),
  role: membershipRole,
  status: membershipStatus,
  verification_level: verificationLevel,
  verification_method: verificationMethod.nullable(),
  program: z.string().nullable(),
  grad_year: z.number().int().nullable(),
  joined_at: isoDateTime.nullable(),
});
export const memberListResponse = successEnvelope(z.array(adminMember));

// ADM-09 PATCH /api/v1/c/{slug}/admin/members/{membership_id}
// Role is never taken from a normal user request. Only this admin endpoint can change it.
export const memberPatchBody = z
  .strictObject({
    role: membershipRole.optional(),
    status: z.enum(["active", "suspended", "left"]).optional(),
    reason: z.string().trim().min(5).max(500).optional(),
  })
  .superRefine((body, ctx) => {
    if (body.role === undefined && body.status === undefined) {
      ctx.addIssue({ code: "custom", message: "Send a role or a status" });
    }
    if ((body.status === "suspended" || body.status === "left") && body.reason === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["reason"],
        message: "A reason is needed to suspend or remove",
      });
    }
  });
export const memberPatchResponse = successEnvelope(z.object({ member: adminMember }));

// ADM-10 GET /api/v1/c/{slug}/admin/audit-logs. The id is a string because it is a 64 bit number.
export const auditLogQuery = paginationQuery.extend({
  action: z.string().min(1).max(100).optional(),
  actor_id: uuid.optional(),
});
export const auditLogEntry = z.object({
  id: z.string().regex(/^\d+$/),
  actor_id: uuid.nullable(),
  actor_role: z.string(),
  action: z.string(),
  target_type: z.string().nullable(),
  target_id: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()),
  request_id: z.string().nullable(),
  created_at: isoDateTime,
});
export const auditLogListResponse = successEnvelope(z.array(auditLogEntry));
