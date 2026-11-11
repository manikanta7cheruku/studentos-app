import { ok, route } from "@/lib/api";
import { pathUuid } from "@/modules/admin/context";
import { memberContext } from "@/modules/engagement/context";
import { cancelEvent, getEvent } from "@/modules/community/community.admin";

// EVT-03 GET /api/v1/c/{slug}/events/{id}
// 404 for an event of another college or one hidden from you.
export const GET = route<{ slug: string; id: string }>(async ({ request, requestId, params }) => {
  const { jar, actorId, collegeId } = await memberContext(request, params.slug);
  return jar.applyTo(ok(await getEvent(actorId, collegeId, pathUuid(params.id)), requestId));
});

// EVT-05 DELETE /api/v1/c/{slug}/events/{id}
// Cancels the event (it stays visible as cancelled). The author, or a moderator or admin (audit logged). 403 for anyone else.
export const DELETE = route<{ slug: string; id: string }>(
  async ({ request, requestId, params }) => {
    const { jar, actorId, collegeId } = await memberContext(request, params.slug, { write: true });
    return jar.applyTo(ok(await cancelEvent(actorId, collegeId, pathUuid(params.id)), requestId));
  },
);
