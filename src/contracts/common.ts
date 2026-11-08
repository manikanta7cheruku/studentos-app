import { z } from "zod";

// Shared building blocks. Source of truth: docs/API_CONTRACT.md sections 1 and 2.

export const uuid = z.uuid();
export const isoDateTime = z.iso.datetime();
export const slug = z
  .string()
  .regex(/^[a-z0-9-]{3,40}$/, "Use 3 to 40 lowercase letters, digits or dashes");
export const email = z.string().trim().toLowerCase().pipe(z.email().max(254));
export const httpsUrl = z
  .url()
  .max(500)
  .refine((value) => value.startsWith("https://"), "Links must start with https://");

// Enums that mirror the database checks (supabase/migrations).
export const membershipRole = z.enum(["student", "moderator", "college_admin"]);
export const membershipStatus = z.enum(["pending", "active", "suspended", "rejected", "left"]);
export const verificationLevel = z.number().int().min(0).max(3);
// "open" is only for the Global college: anyone signed in can join it at once, unverified (level 1).
export const verificationMethod = z.enum([
  "email_domain",
  "invite_code",
  "manual",
  "roster",
  "open",
]);
// What a college admin may switch on. "open" is not on the list: only the Global college has it.
export const selectableVerificationMethod = verificationMethod.exclude(["open"]);

// Envelopes.
export const responseMeta = z.object({
  request_id: z.string().min(1),
  next_cursor: z.string().nullable().optional(),
});

export const successEnvelope = <T extends z.ZodType>(data: T) =>
  z.object({ data, meta: responseMeta });

export const errorCodes = [
  "VALIDATION_FAILED",
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "MEMBERSHIP_NOT_ACTIVE",
  "VERIFICATION_LEVEL_TOO_LOW",
  "TENANT_SUSPENDED",
  "FEATURE_DISABLED",
  "NOT_FOUND",
  "CONFLICT",
  "VERSION_CONFLICT",
  "SLOTS_FULL",
  "ALREADY_REQUESTED",
  "INVITE_INVALID",
  "INVITE_EXHAUSTED",
  "INVITE_EXPIRED",
  "OTP_INVALID",
  "OTP_EXPIRED",
  "IDEMPOTENCY_KEY_REUSED",
  "PAYLOAD_TOO_LARGE",
  "UNSUPPORTED_MEDIA_TYPE",
  "RATE_LIMITED",
  "UPSTREAM_UNAVAILABLE",
  "INTERNAL",
] as const;

export const errorCode = z.enum(errorCodes);
export type ErrorCode = z.infer<typeof errorCode>;

// HTTP status for each code (docs/API_CONTRACT.md section 2).
export const errorHttpStatus: Record<ErrorCode, number> = {
  VALIDATION_FAILED: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  MEMBERSHIP_NOT_ACTIVE: 403,
  VERIFICATION_LEVEL_TOO_LOW: 403,
  TENANT_SUSPENDED: 403,
  FEATURE_DISABLED: 404,
  NOT_FOUND: 404,
  CONFLICT: 409,
  VERSION_CONFLICT: 409,
  SLOTS_FULL: 409,
  ALREADY_REQUESTED: 409,
  INVITE_INVALID: 400,
  INVITE_EXHAUSTED: 409,
  INVITE_EXPIRED: 410,
  OTP_INVALID: 400,
  OTP_EXPIRED: 410,
  IDEMPOTENCY_KEY_REUSED: 422,
  PAYLOAD_TOO_LARGE: 413,
  UNSUPPORTED_MEDIA_TYPE: 415,
  RATE_LIMITED: 429,
  UPSTREAM_UNAVAILABLE: 503,
  INTERNAL: 500,
};

export const validationDetails = z.object({
  fields: z.array(z.object({ path: z.string().min(1), message: z.string().min(1) })).min(1),
});

export const errorEnvelope = z.object({
  error: z
    .object({
      code: errorCode,
      message: z.string().min(1),
      details: z.record(z.string(), z.unknown()).optional(),
      request_id: z.string().min(1),
    })
    .superRefine((error, ctx) => {
      if (
        error.code === "VALIDATION_FAILED" &&
        !validationDetails.safeParse(error.details).success
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["details"],
          message: "VALIDATION_FAILED needs details.fields[] with path and message",
        });
      }
    }),
});

// Query and header helpers.
export const paginationQuery = z.strictObject({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().min(1).max(500).optional(),
});

export const idempotencyKey = z.uuid();

export type ErrorEnvelope = z.infer<typeof errorEnvelope>;
