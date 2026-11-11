import { contentListQuery } from "@/contracts";
import { ok, readQuery, route } from "@/lib/api";
import { modContext } from "@/modules/engagement/context";
import { recentContent } from "@/modules/community/content.admin";

// ADM-14 GET /api/v1/c/{slug}/admin/content?limit=50
// The newest plans, thoughts, events and listings of the college, for moderators and admins.
export const GET = route<{ slug: string }>(async ({ request, requestId, params }) => {
  const { jar, actorId, collegeId } = await modContext(request, params.slug);
  const query = readQuery(request, contentListQuery);
  return jar.applyTo(ok(await recentContent(actorId, collegeId, query.limit), requestId));
});
