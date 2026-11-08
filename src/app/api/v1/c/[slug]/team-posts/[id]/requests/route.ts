import { joinRequestListQuery } from "@/contracts";
import { ok, readQuery, route } from "@/lib/api";
import { decodeCursor } from "@/lib/cursor";
import { pathUuid } from "@/modules/admin/context";
import { memberContext } from "@/modules/engagement/context";
import { listJoinRequests } from "@/modules/teamfinder/teamfinder.admin";

// TMF-07 GET /api/v1/c/{slug}/team-posts/{id}/requests?status=pending&limit=20&cursor=
// Only the author (403 for anyone else). Applicants have a name, headline and skills, never an email address.
export const GET = route<{ slug: string; id: string }>(async ({ request, requestId, params }) => {
  const { jar, actorId, collegeId } = await memberContext(request, params.slug, {
    module: "collaborate",
  });
  const query = readQuery(request, joinRequestListQuery);
  const { items, nextCursor } = await listJoinRequests(actorId, collegeId, pathUuid(params.id), {
    status: query.status,
    limit: query.limit,
    cursor: decodeCursor(query.cursor),
  });
  return jar.applyTo(ok(items, requestId, { nextCursor }));
});
