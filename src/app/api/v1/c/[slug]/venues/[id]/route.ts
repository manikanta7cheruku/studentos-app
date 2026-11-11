import { ok, route } from "@/lib/api";
import { pathUuid } from "@/modules/admin/context";
import { memberContext } from "@/modules/engagement/context";
import { getVenue, hideVenue } from "@/modules/venues/venues.admin";

// VEN-03 GET /api/v1/c/{slug}/venues/{id}
// 404 for a venue of another space, and for one that is hidden.
export const GET = route<{ slug: string; id: string }>(async ({ request, requestId, params }) => {
  const { jar, actorId, collegeId } = await memberContext(request, params.slug);
  return jar.applyTo(ok(await getVenue(actorId, collegeId, pathUuid(params.id)), requestId));
});

// VEN-04 DELETE /api/v1/c/{slug}/venues/{id}
// Hides the venue. Only its manager can (403 FORBIDDEN for anyone else). Waiting requests are declined and those people are told.
export const DELETE = route<{ slug: string; id: string }>(
  async ({ request, requestId, params }) => {
    const { jar, actorId, collegeId } = await memberContext(request, params.slug, { write: true });
    return jar.applyTo(ok(await hideVenue(actorId, collegeId, pathUuid(params.id)), requestId));
  },
);
