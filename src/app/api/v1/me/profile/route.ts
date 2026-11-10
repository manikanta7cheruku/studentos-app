import { profilePatchBody } from "@/contracts";
import { assertSameOrigin, ok, readJson, route } from "@/lib/api";
import { limitWrites } from "@/lib/write-limit";
import { CookieJar, getCurrentUser } from "@/lib/supabase/request-client";
import { ensureProfile } from "@/modules/auth/otp";
import { getMyProfile, updateMyProfile } from "@/modules/profile";

// PRF-01 GET /api/v1/me/profile: Read own profile
export const GET = route(async ({ request, requestId }) => {
  const jar = new CookieJar();
  const { user, supabase } = await getCurrentUser(request, jar);
  // People who signed in with Google before the callback made a profile have none yet: make it now.
  await ensureProfile(supabase, user.id, user.email ?? "");
  const data = await getMyProfile(supabase, user.id);
  return jar.applyTo(ok(data, requestId));
});

// PRF-01 PATCH /api/v1/me/profile: Update own profile
export const PATCH = route(async ({ request, requestId }) => {
  assertSameOrigin(request);
  const jar = new CookieJar();
  const { user, supabase } = await getCurrentUser(request, jar);
  await limitWrites(user.id);
  const patch = await readJson(request, profilePatchBody);
  const data = await updateMyProfile(supabase, user.id, patch);
  return jar.applyTo(ok(data, requestId));
});
