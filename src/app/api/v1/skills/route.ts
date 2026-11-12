import { skillSearchQuery } from "@/contracts";
import { ok, readQuery, route } from "@/lib/api";
import { CookieJar, getCurrentUser } from "@/lib/supabase/request-client";
import { searchSkills } from "@/modules/profile";
import { ensureSuggestedSkill } from "@/modules/profile/skills-catalog.admin";

// PRF-03 GET /api/v1/skills?q=: Autocomplete search for skills in catalog
export const GET = route(async ({ request, requestId }) => {
  const jar = new CookieJar();
  const { supabase } = await getCurrentUser(request, jar);
  const { q } = readQuery(request, skillSearchQuery);
  const data = await searchSkills(supabase, q);
  // Someone tapped a suggestion that the catalog does not have yet: add that one skill and return it.
  if (!data.some((skill) => skill.name.toLowerCase() === q.trim().toLowerCase())) {
    const made = await ensureSuggestedSkill(q);
    if (made) data.unshift(made);
  }
  return jar.applyTo(ok(data, requestId));
});
