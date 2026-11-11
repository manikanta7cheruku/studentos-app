import { ok, route } from "@/lib/api";
import { pathUuid } from "@/modules/admin/context";
import { memberContext } from "@/modules/engagement/context";
import { getIdea, removeIdea } from "@/modules/ideas/ideas.admin";

// IDE-03 GET /api/v1/c/{slug}/ideas/{id}
// 404 for an idea that is removed, hidden from you, or in another college.
export const GET = route<{ slug: string; id: string }>(async ({ request, requestId, params }) => {
  const { jar, actorId, collegeId } = await memberContext(request, params.slug);
  return jar.applyTo(ok(await getIdea(actorId, collegeId, pathUuid(params.id)), requestId));
});

// IDE-05 DELETE /api/v1/c/{slug}/ideas/{id}
// The author, or a moderator or admin of the college. Its replies go with it. { "deleted": true }
export const DELETE = route<{ slug: string; id: string }>(
  async ({ request, requestId, params }) => {
    const { jar, actorId, collegeId } = await memberContext(request, params.slug, { write: true });
    return jar.applyTo(ok(await removeIdea(actorId, collegeId, pathUuid(params.id)), requestId));
  },
);
