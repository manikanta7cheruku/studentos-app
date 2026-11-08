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

// AUTH-04 DELETE /api/v1/me. Two steps with the same call:
//   1. send {} : we email a code to the signed-in person's address, answer { deletion_requested: true, confirmation: "otp" }
//   2. send { "code": "123456" } : the code is checked, the account is deleted for good, answer { deleted: true }
// 409 CONFLICT when the person is the only admin of a college (make someone else admin first).
export const deleteMeBody = z.strictObject({
  code: z
    .string()
    .regex(/^\d{6}$/, "The code has 6 digits")
    .optional(),
});
export const deleteMeResponse = successEnvelope(
  z.union([
    z.object({ deletion_requested: z.literal(true), confirmation: z.literal("otp") }),
    z.object({ deleted: z.literal(true) }),
  ]),
);
