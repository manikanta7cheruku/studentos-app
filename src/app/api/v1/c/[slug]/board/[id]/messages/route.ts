import { boardMessageBody } from "@/contracts";
import { ok, readJson, route } from "@/lib/api";
import { readIdempotencyKey, withIdempotency } from "@/lib/idempotency.admin";
import { pathUuid } from "@/modules/admin/context";
import { memberContext } from "@/modules/engagement/context";
import { listBoardMessages, sendBoardMessage } from "@/modules/community/community.admin";

// BRD-06 GET /api/v1/c/{slug}/board/{id}/messages
// Private. The author sees every thread (each message says who it is with). Anyone else sees only their own thread.
export const GET = route<{ slug: string; id: string }>(async ({ request, requestId, params }) => {
  const { jar, actorId, collegeId } = await memberContext(request, params.slug);
  return jar.applyTo(
    ok(await listBoardMessages(actorId, collegeId, pathUuid(params.id)), requestId),
  );
});

// BRD-07 POST /api/v1/c/{slug}/board/{id}/messages (IDEM)   { "body": "...", "to_user": "only for the author" }
// A person writes to the author. The author answers one person (`to_user`) who has written before. `body` 1 to 500.
// 409 CONFLICT when the post is resolved. 429 at 30 messages an hour.
export const POST = route<{ slug: string; id: string }>(async ({ request, requestId, params }) => {
  const { jar, slug, actorId, collegeId } = await memberContext(request, params.slug, {
    write: true,
  });
  const post = pathUuid(params.id);
  const body = await readJson(request, boardMessageBody);
  const key = readIdempotencyKey(request);
  const result = await withIdempotency(
    { userId: actorId, route: `POST board/${post}/messages ${slug}`, key, body },
    async () => ({ status: 201, data: await sendBoardMessage(actorId, collegeId, post, body) }),
  );
  return jar.applyTo(
    ok(result.data, requestId, {
      status: result.status,
      headers: result.replay ? { "Idempotent-Replay": "true" } : undefined,
    }),
  );
});
