import { eventRsvpBody } from "@/contracts";
import { ok, readJson, route } from "@/lib/api";
import { pathUuid } from "@/modules/admin/context";
import { memberContext } from "@/modules/engagement/context";
import { rsvpEvent } from "@/modules/community/community.admin";

// EVT-04 PUT /api/v1/c/{slug}/events/{id}/rsvp   { "going": true | false }
// Safe to repeat. 409 SLOTS_FULL when the event is full, 409 CONFLICT for an event that is cancelled or long over.
export const PUT = route<{ slug: string; id: string }>(async ({ request, requestId, params }) => {
  const { jar, actorId, collegeId } = await memberContext(request, params.slug, { write: true });
  const body = await readJson(request, eventRsvpBody);
  return jar.applyTo(
    ok(await rsvpEvent(actorId, collegeId, pathUuid(params.id), body.going), requestId),
  );
});
