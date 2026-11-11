import { venueSlotsQuery } from "@/contracts";
import { ok, readQuery, route } from "@/lib/api";
import { pathUuid } from "@/modules/admin/context";
import { memberContext } from "@/modules/engagement/context";
import { venueSlots } from "@/modules/venues/venues.admin";

// VEN-05 GET /api/v1/c/{slug}/venues/{id}/slots?date=2026-11-20
// One entry for every bookable hour of that day: free or booked, how many requests wait, and whether one is mine.
// 400 for a day more than 60 days away.
export const GET = route<{ slug: string; id: string }>(async ({ request, requestId, params }) => {
  const { jar, actorId, collegeId } = await memberContext(request, params.slug);
  const query = readQuery(request, venueSlotsQuery);
  return jar.applyTo(
    ok(await venueSlots(actorId, collegeId, pathUuid(params.id), query.date), requestId),
  );
});
