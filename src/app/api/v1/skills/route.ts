import { skillSearchQuery } from "@/contracts";
import { ok, readQuery, route } from "@/lib/api";
import { CookieJar, getCurrentUser } from "@/lib/supabase/request-client";
import { searchSkills } from "@/modules/profile";

// PRF-03 GET /api/v1/skills?q=: Autocomplete search for skills in catalog
export const GET = route(async ({ request, requestId }) => {
  const jar = new CookieJar();
  const { supabase } = await getCurrentUser(request, jar);
  const { q } = readQuery(request, skillSearchQuery);
  const data = await searchSkills(supabase, q);
  return jar.applyTo(ok(data, requestId));
});
