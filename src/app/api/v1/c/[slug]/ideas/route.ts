import { ideaCreateBody, ideaListQuery } from "@/contracts";
import { ok, readJson, readQuery, route } from "@/lib/api";
import { decodeCursor } from "@/lib/cursor";
import { readIdempotencyKey, withIdempotency } from "@/lib/idempotency.admin";
import { memberContext } from "@/modules/engagement/context";
import { createIdea, listIdeas } from "@/modules/ideas/ideas.admin";

// IDE-02 GET /api/v1/c/{slug}/ideas?sort=new|top&topic=&mine=true&limit=20&cursor=
// `new` is newest first with a cursor. `top` is the best of the last 30 days, one page.
// Removed ideas, ideas of people who left, and ideas of someone you blocked (or who blocked you) never appear.
export const GET = route<{ slug: string }>(async ({ request, requestId, params }) => {
  const { jar, actorId, collegeId } = await memberContext(request, params.slug);
  const query = readQuery(request, ideaListQuery);
  const { items, nextCursor } = await listIdeas(actorId, collegeId, {
    sort: query.sort,
    topic: query.topic,
    mine: query.mine === "true",
    limit: query.limit,
    cursor: decodeCursor(query.cursor),
  });
  return jar.applyTo(ok(items, requestId, { nextCursor }));
});

// IDE-01 POST /api/v1/c/{slug}/ideas (IDEM)
// `title` 5 to 140, `body` up to 2000, `topic` one of campus, study, sports, tech, food, other.
// 201 with the idea. The author's own up vote is counted, so it starts at score 1. 429 at 20 ideas a day.
export const POST = route<{ slug: string }>(async ({ request, requestId, params }) => {
  const { jar, slug, actorId, collegeId } = await memberContext(request, params.slug, {
    write: true,
  });
  const body = await readJson(request, ideaCreateBody);
  const key = readIdempotencyKey(request);
  const result = await withIdempotency(
    { userId: actorId, route: `POST ideas ${slug}`, key, body },
    async () => ({ status: 201, data: await createIdea(actorId, collegeId, body) }),
  );
  return jar.applyTo(
    ok(result.data, requestId, {
      status: result.status,
      headers: result.replay ? { "Idempotent-Replay": "true" } : undefined,
    }),
  );
});
