import { paginationQuery } from "@/contracts";
import { ok, readQuery, route } from "@/lib/api";
import { decodeCursor } from "@/lib/cursor";
import { memberContext } from "@/modules/engagement/context";
import { listAnnouncementsForMember } from "@/modules/engagement/reads";

// ANN-01 GET /api/v1/c/{slug}/announcements?limit=20&cursor=...
// What members see: published, started, not ended, not hidden by a moderator. Pinned first, then newest.
export const GET = route<{ slug: string }>(async ({ request, requestId, params }) => {
  const { jar, collegeId, supabase } = await memberContext(request, params.slug, {
    module: "campus",
  });
  const query = readQuery(request, paginationQuery);
  const { items, nextCursor } = await listAnnouncementsForMember(supabase, collegeId, {
    limit: query.limit,
    cursor: decodeCursor(query.cursor),
  });
  return jar.applyTo(ok(items, requestId, { nextCursor }));
});
