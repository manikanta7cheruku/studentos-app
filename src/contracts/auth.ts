import { z } from "zod";
import { email, slug, successEnvelope, uuid } from "./common";

// AUTH-01 POST /api/v1/auth/otp/request
export const otpRequestBody = z.strictObject({
  email,
  college_slug: slug.optional(),
});
// Always this shape, whether or not the address exists (no account enumeration).
export const otpRequestData = z.object({
  sent: z.literal(true),
  retry_after_seconds: z.number().int().min(0),
});
export const otpRequestResponse = successEnvelope(otpRequestData);

// AUTH-02 POST /api/v1/auth/otp/verify
export const otpVerifyBody = z.strictObject({
  email,
  code: z.string().regex(/^\d{6}$/, "The code is 6 digits"),
});
export const otpVerifyData = z.object({
  user: z.object({ id: uuid, email: z.email() }),
  is_new: z.boolean(),
});
export const otpVerifyResponse = successEnvelope(otpVerifyData);

// AUTH-03 POST /api/v1/auth/logout?all=true
export const logoutQuery = z.strictObject({
  all: z.enum(["true", "false"]).optional(),
});
export const logoutResponse = successEnvelope(z.object({ signed_out: z.literal(true) }));

// AUTH-04 DELETE /api/v1/me (shape is an R2 proposal, confirm when it is built)
export const deleteMeResponse = successEnvelope(
  z.object({
    deletion_requested: z.literal(true),
    confirmation: z.literal("otp"),
  }),
);
