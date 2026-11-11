import { ideaVoteBody } from "@/contracts";
import { ok, readJson, route } from "@/lib/api";
import { pathUuid } from "@/modules/admin/context";
import { memberContext } from "@/modules/engagement/context";
import { voteIdea } from "@/modules/ideas/ideas.admin";

// IDE-04 PUT /api/v1/c/{slug}/ideas/{id}/vote   { "value": 1 | -1 | 0 }
// Sets my vote (0 takes it back). Safe to repeat: the same value twice changes nothing. Answers with the idea.
export const PUT = route<{ slug: string; id: string }>(async ({ request, requestId, params }) => {
  const { jar, actorId, collegeId } = await memberContext(request, params.slug, { write: true });
  const body = await readJson(request, ideaVoteBody);
  return jar.applyTo(
    ok(await voteIdea(actorId, collegeId, pathUuid(params.id), body.value), requestId),
  );
});
