import { myBookingsQuery } from "@/contracts";
import { ok, readQuery, route } from "@/lib/api";
import { memberContext } from "@/modules/engagement/context";
import { myBookings } from "@/modules/venues/venues.admin";

// VEN-08 GET /api/v1/c/{slug}/me/bookings?limit=50
// My own booking requests, newest day first.
export const GET = route<{ slug: string }>(async ({ request, requestId, params }) => {
  const { jar, actorId, collegeId } = await memberContext(request, params.slug);
  const query = readQuery(request, myBookingsQuery);
  return jar.applyTo(ok(await myBookings(actorId, collegeId, query.limit), requestId));
});
