import { z } from "zod";
import {
  email,
  isoDateTime,
  membershipRole,
  membershipStatus,
  slug,
  successEnvelope,
  uuid,
  verificationLevel,
  verificationMethod,
} from "./common";
import { otpRequestData } from "./auth";

// TEN-01 GET /api/v1/colleges/public/{slug}: public branding and enabled join methods.
export const publicCollegeData = z.object({
  slug,
  name: z.string().min(1).max(120),
  short_name: z.string().max(60).nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  accent_hex: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .nullable(),
  logo_url: z.url().nullable(),
  allowed_methods: z.array(verificationMethod).min(1),
  require_admin_approval: z.boolean(),
});
export const publicCollegeResponse = successEnvelope(publicCollegeData);

// The whole membership as the owner sees it.
export const membership = z.object({
  id: uuid,
  role: membershipRole,
  status: membershipStatus,
  verification_level: verificationLevel,
  verification_method: verificationMethod.nullable(),
  program: z.string().max(120).nullable(),
  grad_year: z.number().int().min(2000).max(2100).nullable(),
  joined_at: isoDateTime.nullable(),
  status_reason: z.string().max(500).nullable(),
});

// The short form returned after a join call.
export const membershipSummary = z.object({
  id: uuid,
  status: membershipStatus,
  verification_level: verificationLevel,
  verification_method: verificationMethod.nullable(),
});

// TEN-02 GET /api/v1/c/{slug}/me/membership. `membership` is null when the user has not joined yet.
export const myMembershipResponse = successEnvelope(
  z.object({ membership: membership.nullable() }),
);

const membershipSummaryResponse = successEnvelope(z.object({ membership: membershipSummary }));

// TEN-03 POST /api/v1/c/{slug}/join/invite (IDEM)
export const joinInviteBody = z.strictObject({
  code: z.string().trim().toUpperCase().pipe(z.string().min(1).max(32)),
});
export const joinInviteResponse = membershipSummaryResponse;

// TEN-04 POST /api/v1/c/{slug}/join/manual (IDEM). The server stores the enrolment number hashed.
export const joinManualBody = z.strictObject({
  enrollment_number: z.string().trim().min(3).max(40),
  program: z.string().trim().min(1).max(120),
  grad_year: z.number().int().min(2000).max(2100),
});
export const joinManualResponse = membershipSummaryResponse;

// TEN-05 POST /api/v1/c/{slug}/join/email-domain. Two steps: send a code, then complete with it.
export const joinEmailDomainBody = z.discriminatedUnion("step", [
  z.strictObject({ step: z.literal("start"), email }),
  z.strictObject({ step: z.literal("complete"), email, code: z.string().regex(/^\d{6}$/) }),
]);
export const joinEmailDomainStartResponse = successEnvelope(otpRequestData);
export const joinEmailDomainCompleteResponse = membershipSummaryResponse;

// TEN-07 POST /api/v1/c/{slug}/me/leave
export const leaveResponse = successEnvelope(
  z.object({ membership: z.object({ id: uuid, status: z.literal("left") }) }),
);
