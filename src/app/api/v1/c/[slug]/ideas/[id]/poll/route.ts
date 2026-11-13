import { ideaPollVoteBody } from "@/contracts";
import { ok, readJson, route } from "@/lib/api";
import { pathUuid } from "@/modules/admin/context";
import { memberContext } from "@/modules/engagement/context";
import { voteIdeaPoll } from "@/modules/ideas/ideas.admin";

// IDE-10 POST /api/v1/c/{slug}/ideas/{id}/poll   { "option": 0 }: pick an option of a poll. Picking again changes the pick.
// 404 when the buzz has no poll, 400 for an option that does not exist. Answers with the idea (and the new counts).
export const POST = route<{ slug: string; id: string }>(async ({ request, requestId, params }) => {
  const { jar, actorId, collegeId } = await memberContext(request, params.slug, { write: true });
  const body = await readJson(request, ideaPollVoteBody);
  return jar.applyTo(
    ok(await voteIdeaPoll(actorId, collegeId, pathUuid(params.id), body.option), requestId),
  );
});
