import { bookingCreateBody, venueBookingsQuery } from "@/contracts";
import { ok, readJson, readQuery, route } from "@/lib/api";
import { readIdempotencyKey, withIdempotency } from "@/lib/idempotency.admin";
import { pathUuid } from "@/modules/admin/context";
import { memberContext } from "@/modules/engagement/context";
import { requestBooking, venueBookings } from "@/modules/venues/venues.admin";

// VEN-07 GET /api/v1/c/{slug}/venues/{id}/bookings?status=&limit=50
// The requests of a venue, waiting ones first. Only its manager can see them (403 FORBIDDEN for anyone else).
export const GET = route<{ slug: string; id: string }>(async ({ request, requestId, params }) => {
  const { jar, actorId, collegeId } = await memberContext(request, params.slug);
  const query = readQuery(request, venueBookingsQuery);
  return jar.applyTo(
    ok(await venueBookings(actorId, collegeId, pathUuid(params.id), query), requestId),
  );
});

// VEN-06 POST /api/v1/c/{slug}/venues/{id}/bookings (IDEM)
// `play_date` (today to 30 days ahead), `start_hour` and `hours` (1 to 4) inside the venue's open hours, optional `players` and `note`.
// 201 with the request, waiting for the manager. 409 SLOTS_FULL when a confirmed request already covers those hours,
// 409 ALREADY_REQUESTED when I already asked for overlapping hours, 429 at 6 waiting requests.
export const POST = route<{ slug: string; id: string }>(async ({ request, requestId, params }) => {
  const { jar, slug, actorId, collegeId } = await memberContext(request, params.slug, {
    write: true,
  });
  const venueId = pathUuid(params.id);
  const body = await readJson(request, bookingCreateBody);
  const key = readIdempotencyKey(request);
  const result = await withIdempotency(
    { userId: actorId, route: `POST venue-bookings ${slug} ${venueId}`, key, body },
    async () => ({ status: 201, data: await requestBooking(actorId, collegeId, venueId, body) }),
  );
  return jar.applyTo(
    ok(result.data, requestId, {
      status: result.status,
      headers: result.replay ? { "Idempotent-Replay": "true" } : undefined,
    }),
  );
});
