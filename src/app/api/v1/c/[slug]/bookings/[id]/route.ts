import { ok, route } from "@/lib/api";
import { pathUuid } from "@/modules/admin/context";
import { memberContext } from "@/modules/engagement/context";
import { cancelBooking } from "@/modules/venues/venues.admin";

// VEN-10 DELETE /api/v1/c/{slug}/bookings/{id}
// The person who asked cancels a waiting or confirmed request (the manager is told about a confirmed one).
// 404 for anyone else's request, 409 CONFLICT when it is already declined or cancelled.
export const DELETE = route<{ slug: string; id: string }>(
  async ({ request, requestId, params }) => {
    const { jar, actorId, collegeId } = await memberContext(request, params.slug, { write: true });
    return jar.applyTo(ok(await cancelBooking(actorId, collegeId, pathUuid(params.id)), requestId));
  },
);
