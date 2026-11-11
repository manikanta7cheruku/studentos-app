import { venueCreateBody, venueListQuery } from "@/contracts";
import { ok, readJson, readQuery, route } from "@/lib/api";
import { readIdempotencyKey, withIdempotency } from "@/lib/idempotency.admin";
import { memberContext } from "@/modules/engagement/context";
import { createVenue, listVenues } from "@/modules/venues/venues.admin";

// VEN-01 GET /api/v1/c/{slug}/venues?sport=&limit=50
// The turfs, courts and grounds of this space, by name. Hidden ones are left out.
export const GET = route<{ slug: string }>(async ({ request, requestId, params }) => {
  const { jar, actorId, collegeId } = await memberContext(request, params.slug);
  const query = readQuery(request, venueListQuery);
  return jar.applyTo(ok(await listVenues(actorId, collegeId, query), requestId));
});

// VEN-02 POST /api/v1/c/{slug}/venues (IDEM)
// Inside a college only its admins and moderators add a venue (403 FORBIDDEN for a student). In Global anyone can.
// `name` 3 to 80, 1 to 5 `sports`, optional `area`, `price_inr_per_hour`, `open_hour` and `close_hour`. 201 with the venue.
// 429 at 20 venues per person.
export const POST = route<{ slug: string }>(async ({ request, requestId, params }) => {
  const { jar, slug, actorId, collegeId } = await memberContext(request, params.slug, {
    write: true,
  });
  const body = await readJson(request, venueCreateBody);
  const key = readIdempotencyKey(request);
  const result = await withIdempotency(
    { userId: actorId, route: `POST venues ${slug}`, key, body },
    async () => ({ status: 201, data: await createVenue(actorId, collegeId, body) }),
  );
  return jar.applyTo(
    ok(result.data, requestId, {
      status: result.status,
      headers: result.replay ? { "Idempotent-Replay": "true" } : undefined,
    }),
  );
});
