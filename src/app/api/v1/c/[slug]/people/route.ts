import { ok, route } from "@/lib/api";
import { CookieJar } from "@/lib/supabase/request-client";
import { requireMember } from "@/modules/tenancy/require-member";
import { getVisibleCollegePeople } from "@/modules/profile";

// PRF-05 GET /api/v1/c/{slug}/people?q=
// Returns directory of college members who have visibility = 'college'. Hidden profiles are never returned.
export const GET = route<{ slug: string }>(async ({ request, requestId, params }) => {
  const jar = new CookieJar();
  const { supabase, membership } = await requireMember(request, jar, params.slug, {
    minLevel: 1,
  });

  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? undefined;

  const people = await getVisibleCollegePeople(supabase, membership.college_id, {
    query: q?.slice(0, 80),
  });
  return jar.applyTo(ok(people, requestId));
});
