import { ideaCommentCreateBody } from "@/contracts";
import { ok, readJson, route } from "@/lib/api";
import { readIdempotencyKey, withIdempotency } from "@/lib/idempotency.admin";
import { pathUuid } from "@/modules/admin/context";
import { memberContext } from "@/modules/engagement/context";
import { createIdeaComment, listIdeaComments } from "@/modules/ideas/ideas.admin";

// IDE-07 GET /api/v1/c/{slug}/ideas/{id}/comments
// Oldest first, all in one answer. Removed comments and comments of someone you blocked do not appear.
export const GET = route<{ slug: string; id: string }>(async ({ request, requestId, params }) => {
  const { jar, actorId, collegeId } = await memberContext(request, params.slug);
  return jar.applyTo(
    ok(await listIdeaComments(actorId, collegeId, pathUuid(params.id)), requestId),
  );
});

// IDE-06 POST /api/v1/c/{slug}/ideas/{id}/comments (IDEM)   { "body": "...", "parent_id": "optional" }
// `body` 1 to 800. A reply goes under a top level comment of the same idea. 429 at 40 comments an hour.
export const POST = route<{ slug: string; id: string }>(async ({ request, requestId, params }) => {
  const { jar, slug, actorId, collegeId } = await memberContext(request, params.slug, {
    write: true,
  });
  const idea = pathUuid(params.id);
  const body = await readJson(request, ideaCommentCreateBody);
  const key = readIdempotencyKey(request);
  const result = await withIdempotency(
    { userId: actorId, route: `POST ideas/${idea}/comments ${slug}`, key, body },
    async () => ({ status: 201, data: await createIdeaComment(actorId, collegeId, idea, body) }),
  );
  return jar.applyTo(
    ok(result.data, requestId, {
      status: result.status,
      headers: result.replay ? { "Idempotent-Replay": "true" } : undefined,
    }),
  );
});
