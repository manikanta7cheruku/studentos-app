import { ok, route } from "@/lib/api";
import { pathUuid } from "@/modules/admin/context";
import { memberContext } from "@/modules/engagement/context";
import { getBoardPost, removeBoardPost } from "@/modules/community/community.admin";

// BRD-03 GET /api/v1/c/{slug}/board/{id}
// 404 for a post that is removed, hidden from you, or in another college.
export const GET = route<{ slug: string; id: string }>(async ({ request, requestId, params }) => {
  const { jar, actorId, collegeId } = await memberContext(request, params.slug);
  return jar.applyTo(ok(await getBoardPost(actorId, collegeId, pathUuid(params.id)), requestId));
});

// BRD-05 DELETE /api/v1/c/{slug}/board/{id}
// The author, or a moderator or admin (audit logged). { "deleted": true }. 403 for anyone else.
export const DELETE = route<{ slug: string; id: string }>(
  async ({ request, requestId, params }) => {
    const { jar, actorId, collegeId } = await memberContext(request, params.slug, { write: true });
    return jar.applyTo(
      ok(await removeBoardPost(actorId, collegeId, pathUuid(params.id)), requestId),
    );
  },
);
