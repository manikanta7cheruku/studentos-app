import { ok, route } from "@/lib/api";
import { pathUuid } from "@/modules/admin/context";
import { memberContext } from "@/modules/engagement/context";
import { removeIdeaComment } from "@/modules/ideas/ideas.admin";

// IDE-08 DELETE /api/v1/c/{slug}/ideas/{id}/comments/{commentId}
// The author of the comment, or a moderator or admin of the college. { "deleted": true }
export const DELETE = route<{ slug: string; id: string; commentId: string }>(
  async ({ request, requestId, params }) => {
    const { jar, actorId, collegeId } = await memberContext(request, params.slug, { write: true });
    return jar.applyTo(
      ok(await removeIdeaComment(actorId, collegeId, pathUuid(params.commentId)), requestId),
    );
  },
);
