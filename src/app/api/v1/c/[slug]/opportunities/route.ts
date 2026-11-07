import { opportunityListQuery } from "@/contracts";
import { ok, readQuery, route } from "@/lib/api";
import { decodeCursor } from "@/lib/cursor";
import { memberContext } from "@/modules/engagement/context";
import { listOpportunities } from "@/modules/opportunities/opportunities.admin";

// OPP-01 GET /api/v1/c/{slug}/opportunities?kind=job,internship&skills=React,SQL&mode=remote&location=hyd
//   &deadline=any|7d|30d|hide_closed&q=acme&saved=true&limit=20&cursor=
// Newest first. Members only. Drafts and removed listings are never shown. A listing past its deadline has
// status "expired" (use deadline=hide_closed to leave them out). `saved=true` is "my saved".
// 404 FEATURE_DISABLED when the college switched the Career tab off.
export const GET = route<{ slug: string }>(async ({ request, requestId, params }) => {
  const { jar, actorId, collegeId } = await memberContext(request, params.slug);
  const query = readQuery(request, opportunityListQuery);
  const { items, nextCursor } = await listOpportunities(actorId, collegeId, {
    kinds: query.kind,
    skills: query.skills,
    mode: query.mode,
    location: query.location,
    deadline: query.deadline,
    q: query.q,
    saved: query.saved === "true",
    limit: query.limit,
    cursor: decodeCursor(query.cursor),
  });
  return jar.applyTo(ok(items, requestId, { nextCursor }));
});
