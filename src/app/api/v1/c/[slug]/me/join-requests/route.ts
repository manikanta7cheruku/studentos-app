import { joinRequestListQuery } from "@/contracts";
import { ok, readQuery, route } from "@/lib/api";
import { decodeCursor } from "@/lib/cursor";
import { memberContext } from "@/modules/engagement/context";
import { listMyJoinRequests } from "@/modules/teamfinder/teamfinder.admin";

// TMF-10 GET /api/v1/c/{slug}/me/join-requests?status=&limit=20&cursor=
// My own requests in this college, newest first, each with the post title and the role.
export const GET = route<{ slug: string }>(async ({ request, requestId, params }) => {
  const { jar, actorId, collegeId } = await memberContext(request, params.slug);
  const query = readQuery(request, joinRequestListQuery);
  const { items, nextCursor } = await listMyJoinRequests(actorId, collegeId, {
    status: query.status,
    limit: query.limit,
    cursor: decodeCursor(query.cursor),
  });
  return jar.applyTo(ok(items, requestId, { nextCursor }));
});
