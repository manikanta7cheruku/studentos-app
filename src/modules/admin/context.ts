import { slug as slugSchema, uuid as uuidSchema } from "@/contracts";
import { assertSameOrigin } from "@/lib/api";
import { AppError } from "@/lib/errors";
import { hashKey } from "@/lib/hash";
import { CookieJar } from "@/lib/supabase/request-client";
import { consumeOrThrow } from "@/modules/rate-limit/rate-limit.admin";
import { requireMember } from "@/modules/tenancy/require-member";

// What every admin endpoint does first, in the order of docs/API_CONTRACT.md section 1:
// same-origin check (for changes), who is calling, is the college theirs, are they an active ADMIN
// (a student or moderator gets 403, someone from another college gets 404), then the rate limit
// (120 admin calls per minute per person).
export async function adminContext(
  request: Request,
  rawSlug: string,
  options: { write?: boolean } = {},
) {
  if (options.write) assertSameOrigin(request);
  const slug = slugSchema.safeParse(rawSlug);
  if (!slug.success) throw new AppError("NOT_FOUND");
  const jar = new CookieJar();
  const member = await requireMember(request, jar, slug.data, { roles: ["college_admin"] });
  await consumeOrThrow("admin_user", hashKey("user", member.user.id), 120, 60);
  return {
    jar,
    slug: slug.data,
    actorId: member.user.id,
    collegeId: member.membership.college_id,
  };
}

// A path parameter that must be a UUID. Anything else is simply "not found".
export function pathUuid(value: string): string {
  const parsed = uuidSchema.safeParse(value);
  if (!parsed.success) throw new AppError("NOT_FOUND");
  return parsed.data;
}
