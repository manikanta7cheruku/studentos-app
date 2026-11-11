import type { SupabaseClient } from "@supabase/supabase-js";
import { slug as slugSchema } from "@/contracts";
import { assertSameOrigin } from "@/lib/api";
import { AppError } from "@/lib/errors";
import { hashKey } from "@/lib/hash";
import { CookieJar, getCurrentUser } from "@/lib/supabase/request-client";
import { limitReads, limitWrites } from "@/lib/write-limit";
import { consumeOrThrow } from "@/modules/rate-limit/rate-limit.admin";
import { requireMember } from "@/modules/tenancy/require-member";

function parseSlug(rawSlug: string): string {
  const slug = slugSchema.safeParse(rawSlug);
  if (!slug.success) throw new AppError("NOT_FOUND");
  return slug.data;
}

export type CollegeModule = "campus" | "collaborate" | "career";

// A college can switch a tab off (college_settings.features.<tab> = false, ADM-03). Then its API answers 404
// FEATURE_DISABLED, not only its screens. A missing flag means on. Read with the member's own rights.
export async function assertModuleEnabled(
  supabase: SupabaseClient,
  collegeId: string,
  module: CollegeModule,
): Promise<void> {
  const { data, error } = await supabase
    .from("college_settings")
    .select("features")
    .eq("college_id", collegeId)
    .maybeSingle();
  if (error) throw new AppError("UPSTREAM_UNAVAILABLE", { cause: error });
  const features = (data?.features ?? {}) as Record<string, unknown>;
  if (features[module] === false) throw new AppError("FEATURE_DISABLED");
}

// An active member of the college (level 1 or more). Writes also check the origin and the 60 a minute limit,
// reads the 300 a minute limit. `module` makes the call answer FEATURE_DISABLED when the college has that tab off.
export async function memberContext(
  request: Request,
  rawSlug: string,
  options: { write?: boolean; module?: CollegeModule } = {},
) {
  if (options.write) assertSameOrigin(request);
  const slug = parseSlug(rawSlug);
  const jar = new CookieJar();
  const member = await requireMember(request, jar, slug, { minLevel: 1 });
  // The rate limit and the "is this tab on" check do not depend on each other, so they run together
  // (each one is a trip to the database).
  const { module } = options;
  await Promise.all([
    options.write ? limitWrites(member.user.id) : limitReads(member.user.id),
    module
      ? assertModuleEnabled(member.supabase, member.membership.college_id, module)
      : Promise.resolve(),
  ]);
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
  else await limitReads(user.id);
  return { jar, userId: user.id, supabase };
}
