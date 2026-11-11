import { boardCreateBody, boardListQuery } from "@/contracts";
import { ok, readJson, readQuery, route } from "@/lib/api";
import { decodeCursor } from "@/lib/cursor";
import { readIdempotencyKey, withIdempotency } from "@/lib/idempotency.admin";
import { memberContext } from "@/modules/engagement/context";
import { createBoardPost, listBoardPosts } from "@/modules/community/community.admin";

// BRD-02 GET /api/v1/c/{slug}/board?board=lostfound|market&kind=&status=open|resolved|all&mine=true&limit=20&cursor=
// Newest first. `status` is open by default. Removed posts, posts of people who left and blocked people never appear.
export const GET = route<{ slug: string }>(async ({ request, requestId, params }) => {
  const { jar, actorId, collegeId } = await memberContext(request, params.slug);
  const query = readQuery(request, boardListQuery);
  const { items, nextCursor } = await listBoardPosts(actorId, collegeId, {
    board: query.board,
    kind: query.kind,
    status: query.status,
    mine: query.mine === "true",
    limit: query.limit,
    cursor: decodeCursor(query.cursor),
  });
  return jar.applyTo(ok(items, requestId, { nextCursor }));
});

// BRD-01 POST /api/v1/c/{slug}/board (IDEM)
// `board` lostfound (kind lost or found) or market (kind sell, rent, free or wanted). `price_inr` in whole rupees, only for
// sell, rent or wanted. 201 with the post. 429 at 15 posts a day.
export const POST = route<{ slug: string }>(async ({ request, requestId, params }) => {
  const { jar, slug, actorId, collegeId } = await memberContext(request, params.slug, {
    write: true,
  });
  const body = await readJson(request, boardCreateBody);
  const key = readIdempotencyKey(request);
  const result = await withIdempotency(
    { userId: actorId, route: `POST board ${slug}`, key, body },
    async () => ({ status: 201, data: await createBoardPost(actorId, collegeId, body) }),
  );
  return jar.applyTo(
    ok(result.data, requestId, {
      status: result.status,
      headers: result.replay ? { "Idempotent-Replay": "true" } : undefined,
    }),
  );
});
