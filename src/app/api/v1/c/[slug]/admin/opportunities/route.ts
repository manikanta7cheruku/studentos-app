import { adminOpportunityListQuery, opportunityCreateBody } from "@/contracts";
import { ok, readJson, readQuery, route } from "@/lib/api";
import { decodeCursor } from "@/lib/cursor";
import { readIdempotencyKey, withIdempotency } from "@/lib/idempotency.admin";
import { modContext } from "@/modules/engagement/context";
import {
  createOpportunity,
  listOpportunitiesForModerators,
} from "@/modules/opportunities/opportunities.admin";

// OPP-03 GET /api/v1/c/{slug}/admin/opportunities?status=draft&limit=&cursor=
// Moderators and admins: every listing of the college, drafts and removed ones included (raw_status is the stored one).
export const GET = route<{ slug: string }>(async ({ request, requestId, params }) => {
  const { jar, actorId, collegeId } = await modContext(request, params.slug);
  const query = readQuery(request, adminOpportunityListQuery);
  const { items, nextCursor } = await listOpportunitiesForModerators(actorId, collegeId, {
    status: query.status,
    limit: query.limit,
    cursor: decodeCursor(query.cursor),
  });
  return jar.applyTo(ok(items, requestId, { nextCursor }));
});

// OPP-03 POST /api/v1/c/{slug}/admin/opportunities (IDEM)
// Every listing has a poster and a last verified date (no scraping). Audit row: opportunity.created.
export const POST = route<{ slug: string }>(async ({ request, requestId, params }) => {
  const { jar, slug, actorId, collegeId } = await modContext(request, params.slug, { write: true });
  const body = await readJson(request, opportunityCreateBody);
  const key = readIdempotencyKey(request);
  const result = await withIdempotency(
    { userId: actorId, route: `POST admin/opportunities ${slug}`, key, body },
    async () => ({
      status: 201,
      data: await createOpportunity(actorId, collegeId, body, requestId),
    }),
  );
  return jar.applyTo(
    ok(result.data, requestId, {
      status: result.status,
      headers: result.replay ? { "Idempotent-Replay": "true" } : undefined,
    }),
  );
});
