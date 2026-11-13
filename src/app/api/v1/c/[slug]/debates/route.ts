import { debateCreateBody, debateListQuery } from "@/contracts";
import { ok, readJson, readQuery, route } from "@/lib/api";
import { decodeCursor } from "@/lib/cursor";
import { readIdempotencyKey, withIdempotency } from "@/lib/idempotency.admin";
import { memberContext } from "@/modules/engagement/context";
import { createDebate, listDebates } from "@/modules/debates/debates.admin";

// DEB-02 GET /api/v1/c/{slug}/debates?status=live|ended|all&topic=&limit=20&cursor=
// Newest first. Removed debates, debates of people who left, and of someone you blocked (or who blocked you) never appear.
export const GET = route<{ slug: string }>(async ({ request, requestId, params }) => {
  const { jar, actorId, collegeId } = await memberContext(request, params.slug);
  const query = readQuery(request, debateListQuery);
  const { items, nextCursor } = await listDebates(actorId, collegeId, {
    status: query.status,
    topic: query.topic,
    limit: query.limit,
    cursor: decodeCursor(query.cursor),
  });
  return jar.applyTo(ok(items, requestId, { nextCursor }));
});

// DEB-01 POST /api/v1/c/{slug}/debates (IDEM)
// `title` 5 to 140, optional `body`, `topic`, two different sides (1 to 30 characters each) and `hours` (1, 6, 24, 72 or 168).
// 201 with the debate. 429 at 3 debates a day.
export const POST = route<{ slug: string }>(async ({ request, requestId, params }) => {
  const { jar, slug, actorId, collegeId } = await memberContext(request, params.slug, {
    write: true,
  });
  const body = await readJson(request, debateCreateBody);
  const key = readIdempotencyKey(request);
  const result = await withIdempotency(
    { userId: actorId, route: `POST debates ${slug}`, key, body },
    async () => ({ status: 201, data: await createDebate(actorId, collegeId, body) }),
  );
  return jar.applyTo(
    ok(result.data, requestId, {
      status: result.status,
      headers: result.replay ? { "Idempotent-Replay": "true" } : undefined,
    }),
  );
});
