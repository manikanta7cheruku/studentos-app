import { ideaVoteBody } from "@/contracts";
import { ok, readJson, route } from "@/lib/api";
import { pathUuid } from "@/modules/admin/context";
import { memberContext } from "@/modules/engagement/context";
import { voteIdeaComment } from "@/modules/ideas/ideas.admin";

// IDE-09 PUT /api/v1/c/{slug}/ideas/{id}/comments/{commentId}/vote   { "value": 1 | -1 | 0 }
// Like (1), dislike (-1), or take my vote back (0). Safe to repeat. Answers with the comment, with its `score` and `my_vote`.
// 404 for a comment that is not in this idea or this space, or that was removed.
export const PUT = route<{ slug: string; id: string; commentId: string }>(
  async ({ request, requestId, params }) => {
    const { jar, actorId, collegeId } = await memberContext(request, params.slug, { write: true });
    const body = await readJson(request, ideaVoteBody);
    pathUuid(params.id);
    return jar.applyTo(
      ok(
        await voteIdeaComment(actorId, collegeId, pathUuid(params.commentId), body.value),
        requestId,
      ),
    );
  },
);
