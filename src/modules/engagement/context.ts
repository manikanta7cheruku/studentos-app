import { slug as slugSchema } from "@/contracts";
import { assertSameOrigin } from "@/lib/api";
import { AppError } from "@/lib/errors";
import { hashKey } from "@/lib/hash";
import { CookieJar, getCurrentUser } from "@/lib/supabase/request-client";
import { limitWrites } from "@/lib/write-limit";
import { consumeOrThrow } from "@/modules/rate-limit/rate-limit.admin";
import { requireMember } from "@/modules/tenancy/require-member";

function parseSlug(rawSlug: string): string {
  const slug = slugSchema.safeParse(rawSlug);
  if (!slug.success) throw new AppError("NOT_FOUND");
  return slug.data;
}

// An active member of the college (level 1 or more). Writes also check the origin and the 60 a minute limit.
export async function memberContext(
  request: Request,
  rawSlug: string,
  options: { write?: boolean } = {},
) {
  if (options.write) assertSameOrigin(request);
  const slug = parseSlug(rawSlug);
  const jar = new CookieJar();
  const member = await requireMember(request, jar, slug, { minLevel: 1 });
  if (options.write) await limitWrites(member.user.id);
  return {
    jar,
    slug,
    actorId: member.user.id,
    collegeId: member.membership.college_id,
    supabase: member.supabase,
  };
}

// A moderator or an admin of the college. Moderators and admins get 120 calls a minute, like the admin endpoints.
export async function modContext(
  request: Request,
  rawSlug: string,
  options: { write?: boolean } = {},
) {
  if (options.write) assertSameOrigin(request);
  const slug = parseSlug(rawSlug);
  const jar = new CookieJar();
  const member = await requireMember(request, jar, slug, { roles: ["moderator", "college_admin"] });
  await consumeOrThrow("admin_user", hashKey("user", member.user.id), 120, 60);
  return {
    jar,
    slug,
    actorId: member.user.id,
    collegeId: member.membership.college_id,
    role: member.membership.role,
  };
}

// Any signed-in person (not tied to one college), for /me/... endpoints.
export async function meContext(request: Request, options: { write?: boolean } = {}) {
  if (options.write) assertSameOrigin(request);
  const jar = new CookieJar();
  const { user, supabase } = await getCurrentUser(request, jar);
  if (options.write) await limitWrites(user.id);
  return { jar, userId: user.id, supabase };
}
