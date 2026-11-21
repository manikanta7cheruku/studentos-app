import { ok, route } from "@/lib/api";
import { pathUuid } from "@/modules/admin/context";
import { memberContext } from "@/modules/engagement/context";
import { getGame } from "@/modules/games/games.admin";

// GAM-03 GET /api/v1/c/{slug}/games/{id}
// One game with the players who are in. The host also gets the requests and the waiting list. 404 for an unknown game, or one
// by someone who blocked me or whom I blocked.
export const GET = route<{ slug: string; id: string }>(async ({ request, requestId, params }) => {
  const { jar, actorId, collegeId } = await memberContext(request, params.slug);
  return jar.applyTo(ok(await getGame(actorId, collegeId, pathUuid(params.id)), requestId));
});
