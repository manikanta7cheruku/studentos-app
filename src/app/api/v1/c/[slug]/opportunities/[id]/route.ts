import { ok, route } from "@/lib/api";
import { pathUuid } from "@/modules/admin/context";
import { memberContext } from "@/modules/engagement/context";
import { getOpportunity } from "@/modules/opportunities/opportunities.admin";

// OPP-02 GET /api/v1/c/{slug}/opportunities/{id}
// Members only. 404 for a draft, a removed listing or one of another college.
export const GET = route<{ slug: string; id: string }>(async ({ request, requestId, params }) => {
  const { jar, actorId, collegeId } = await memberContext(request, params.slug);
  return jar.applyTo(ok(await getOpportunity(actorId, collegeId, pathUuid(params.id)), requestId));
});
