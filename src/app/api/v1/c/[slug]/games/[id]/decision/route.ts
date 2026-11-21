import { gameDecisionBody } from "@/contracts";
import { ok, readJson, route } from "@/lib/api";
import { pathUuid } from "@/modules/admin/context";
import { memberContext } from "@/modules/engagement/context";
import { decideGame } from "@/modules/games/games.admin";

// GAM-06 POST /api/v1/c/{slug}/games/{id}/decision   { "user_id": "...", "decision": "accepted" | "declined" | "removed" }
// Only the host (403 FORBIDDEN for anyone else). accepted and declined answer a request or someone on the waiting list; removed
// takes out someone who is in. The person is told. 409 SLOTS_FULL when accepting and every place is taken, 409 CONFLICT when
// the game is cancelled or the person is not in that state.
export const POST = route<{ slug: string; id: string }>(async ({ request, requestId, params }) => {
  const { jar, actorId, collegeId } = await memberContext(request, params.slug, { write: true });
  const body = await readJson(request, gameDecisionBody);
  return jar.applyTo(
    ok(await decideGame(actorId, collegeId, pathUuid(params.id), body), requestId),
  );
});
