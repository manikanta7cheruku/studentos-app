import { z } from "zod";
import { slug, successEnvelope, uuid } from "./common";

// ---------------------------------------------------------------------------
// College setup (COL-01): a person with a one-time code from the platform owner makes their own college.
// Rules: docs/AUTH_AND_TENANCY.md section 7 and decision D-30.
// ---------------------------------------------------------------------------
const domain = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^(?!-)[a-z0-9-]+(\.[a-z0-9-]+)+$/, "Use a domain like alpha.edu")
  .max(100);

export const collegeSetupBody = z.strictObject({
  // The 8 digit code the platform owner sent. Works once.
  code: z.string().regex(/^\d{8}$/, "The code has 8 digits"),
  slug,
  name: z.string().trim().min(3).max(120),
  short_name: z.string().trim().max(12).optional(),
  city: z.string().trim().max(80).default(""),
  state: z.string().trim().max(80).default(""),
  domains: z.array(domain).max(5).default([]),
  // email: anyone with a college address joins after a code. invite: only with an invite link.
  // approval: the admin approves each person.
  join_method: z.enum(["email", "invite", "approval"]),
});
export const collegeSetupResponse = successEnvelope(z.object({ college_id: uuid, slug }));
