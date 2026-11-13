import { ok, route } from "@/lib/api";
import { pathUuid } from "@/modules/admin/context";
import { memberContext } from "@/modules/engagement/context";
import { getDebate, removeDebate } from "@/modules/debates/debates.admin";

// DEB-03 GET /api/v1/c/{slug}/debates/{id}: one debate with the counts and my side. 404 when removed, hidden or in another space.
export const GET = route<{ slug: string; id: string }>(async ({ request, requestId, params }) => {
  const { jar, actorId, collegeId } = await memberContext(request, params.slug);
  return jar.applyTo(ok(await getDebate(actorId, collegeId, pathUuid(params.id)), requestId));
});

// DEB-08 DELETE /api/v1/c/{slug}/debates/{id}: the author, or a moderator or admin (audit logged). 403 for anyone else.
export const DELETE = route<{ slug: string; id: string }>(
  async ({ request, requestId, params }) => {
    const { jar, actorId, collegeId } = await memberContext(request, params.slug, { write: true });
    return jar.applyTo(ok(await removeDebate(actorId, collegeId, pathUuid(params.id)), requestId));
  },
);
