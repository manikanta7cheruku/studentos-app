import { ok, route } from "@/lib/api";
import { pathUuid } from "@/modules/admin/context";
import { memberContext } from "@/modules/engagement/context";
import { cancelGame } from "@/modules/games/games.admin";

// GAM-07 POST /api/v1/c/{slug}/games/{id}/cancel
// Only the host (403 FORBIDDEN for anyone else). Everyone who was in or waiting is told. 409 CONFLICT when already cancelled.
export const POST = route<{ slug: string; id: string }>(async ({ request, requestId, params }) => {
  const { jar, actorId, collegeId } = await memberContext(request, params.slug, { write: true });
  return jar.applyTo(ok(await cancelGame(actorId, collegeId, pathUuid(params.id)), requestId));
});
