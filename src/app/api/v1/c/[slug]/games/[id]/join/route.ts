import { ok, route } from "@/lib/api";
import { pathUuid } from "@/modules/admin/context";
import { memberContext } from "@/modules/engagement/context";
import { joinGame, leaveGame } from "@/modules/games/games.admin";

// GAM-04 POST /api/v1/c/{slug}/games/{id}/join
// An open game with a free place: I am in. A full game: I am on the waiting list. A game the host approves: a request for the
// host (the waiting list when every place is taken or promised). Asking again changes nothing. 409 CONFLICT when the game was
// cancelled or has passed, 403 FORBIDDEN when the host declined or removed me.
export const POST = route<{ slug: string; id: string }>(async ({ request, requestId, params }) => {
  const { jar, actorId, collegeId } = await memberContext(request, params.slug, { write: true });
  return jar.applyTo(ok(await joinGame(actorId, collegeId, pathUuid(params.id)), requestId));
});

// GAM-05 DELETE /api/v1/c/{slug}/games/{id}/join
// Take back a request, leave the waiting list, or say I cannot make it. The host is told when someone who was in drops out, and
// the first person waiting gets the place. 403 FORBIDDEN for the host (they cancel the game), 404 when I am not in it.
export const DELETE = route<{ slug: string; id: string }>(
  async ({ request, requestId, params }) => {
    const { jar, actorId, collegeId } = await memberContext(request, params.slug, { write: true });
    return jar.applyTo(ok(await leaveGame(actorId, collegeId, pathUuid(params.id)), requestId));
  },
);
