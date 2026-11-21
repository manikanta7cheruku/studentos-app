import { gameCreateBody, gameListQuery } from "@/contracts";
import { ok, readJson, readQuery, route } from "@/lib/api";
import { readIdempotencyKey, withIdempotency } from "@/lib/idempotency.admin";
import { memberContext } from "@/modules/engagement/context";
import { createGame, listGames } from "@/modules/games/games.admin";

// GAM-01 GET /api/v1/c/{slug}/games?sport=&mine=true&limit=50
// Upcoming games of this space, soonest first. With `mine=true`: the games I host or am part of, including the ones just played.
export const GET = route<{ slug: string }>(async ({ request, requestId, params }) => {
  const { jar, actorId, collegeId } = await memberContext(request, params.slug);
  const query = readQuery(request, gameListQuery);
  return jar.applyTo(ok(await listGames(actorId, collegeId, query), requestId));
});

// GAM-02 POST /api/v1/c/{slug}/games (IDEM)
// Any active member can set up a game, in a college or in Global. `sport` 2 to 24, `venue` 3 to 80, optional `area`, `starts_at`
// (in the future, up to 90 days), `hours` 1 to 6, `capacity` 2 to 40 (all the players wanted, the host included), optional
// `price_inr` for each person (shown only), `join_mode` open or approval, `note`. 201 with the game, the host already in.
// 429 at 8 upcoming games hosted at once.
export const POST = route<{ slug: string }>(async ({ request, requestId, params }) => {
  const { jar, slug, actorId, collegeId } = await memberContext(request, params.slug, {
    write: true,
  });
  const body = await readJson(request, gameCreateBody);
  const key = readIdempotencyKey(request);
  const result = await withIdempotency(
    { userId: actorId, route: `POST games ${slug}`, key, body },
    async () => ({ status: 201, data: await createGame(actorId, collegeId, body) }),
  );
  return jar.applyTo(
    ok(result.data, requestId, {
      status: result.status,
      headers: result.replay ? { "Idempotent-Replay": "true" } : undefined,
    }),
  );
});
