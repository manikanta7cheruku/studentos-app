import { bookingDecisionBody } from "@/contracts";
import { ok, readJson, route } from "@/lib/api";
import { pathUuid } from "@/modules/admin/context";
import { memberContext } from "@/modules/engagement/context";
import { decideBooking } from "@/modules/venues/venues.admin";

// VEN-09 POST /api/v1/c/{slug}/bookings/{id}/decision   { "decision": "confirmed" | "declined", "note": "optional" }
// Only the venue's manager (403 FORBIDDEN for anyone else). The person who asked is told. 409 CONFLICT when the request
// was already answered, 409 SLOTS_FULL when another confirmed request covers those hours.
export const POST = route<{ slug: string; id: string }>(async ({ request, requestId, params }) => {
  const { jar, actorId, collegeId } = await memberContext(request, params.slug, { write: true });
  const body = await readJson(request, bookingDecisionBody);
  return jar.applyTo(
    ok(await decideBooking(actorId, collegeId, pathUuid(params.id), body), requestId),
  );
});
