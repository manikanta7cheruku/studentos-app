import { reportQueueQuery } from "@/contracts";
import { ok, readQuery, route } from "@/lib/api";
import { decodeCursor } from "@/lib/cursor";
import { modContext } from "@/modules/engagement/context";
import { listReports } from "@/modules/engagement/engagement.admin";

// RPT-02 GET /api/v1/c/{slug}/admin/reports?status=open&limit=20&cursor=...
// The moderation queue, newest first. Each item shows the reporter and the title of the reported item.
export const GET = route<{ slug: string }>(async ({ request, requestId, params }) => {
  const { jar, actorId, collegeId } = await modContext(request, params.slug);
  const query = readQuery(request, reportQueueQuery);
  const { items, nextCursor } = await listReports(actorId, collegeId, {
    status: query.status,
    limit: query.limit,
    cursor: decodeCursor(query.cursor),
  });
  return jar.applyTo(ok(items, requestId, { nextCursor }));
});
