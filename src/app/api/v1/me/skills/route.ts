import { skillsPutBody } from "@/contracts";
import { assertSameOrigin, ok, readJson, route } from "@/lib/api";
import { CookieJar, getCurrentUser } from "@/lib/supabase/request-client";
import { getMySkills, updateMySkills } from "@/modules/profile";

// GET /api/v1/me/skills: Read own skill list
export const GET = route(async ({ request, requestId }) => {
  const jar = new CookieJar();
  const { user, supabase } = await getCurrentUser(request, jar);
  const data = await getMySkills(supabase, user.id);
  return jar.applyTo(ok(data, requestId));
});

// PRF-02 PUT /api/v1/me/skills: Replace own skill list (requires active membership level >= 1)
export const PUT = route(async ({ request, requestId }) => {
  assertSameOrigin(request);
  const jar = new CookieJar();
  const { user, supabase } = await getCurrentUser(request, jar);
  const body = await readJson(request, skillsPutBody);
  const data = await updateMySkills(supabase, user.id, body.skills);
  return jar.applyTo(ok(data, requestId));
});
