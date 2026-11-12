import { dmSendBody } from "@/contracts";
import { ok, readJson, route } from "@/lib/api";
import { readIdempotencyKey, withIdempotency } from "@/lib/idempotency.admin";
import { pathUuid } from "@/modules/admin/context";
import { memberContext } from "@/modules/engagement/context";
import { getThread, sendMessage } from "@/modules/messages/messages.admin";

// MSG-02 GET /api/v1/c/{slug}/messages/{userId}
// One conversation. Opening it marks their messages as opened, so they disappear 1 hour later. 404 for someone who is not an
// active member of this college. `can_message` is false when one of us blocked the other.
export const GET = route<{ slug: string; userId: string }>(
  async ({ request, requestId, params }) => {
    const { jar, actorId, collegeId } = await memberContext(request, params.slug);
    return jar.applyTo(ok(await getThread(actorId, collegeId, pathUuid(params.userId)), requestId));
  },
);

// MSG-03 POST /api/v1/c/{slug}/messages/{userId} (IDEM)   { "body": "up to 500 characters" }
// Text only. 201 with the message and when it will expire if it is never opened (3 days). 403 FORBIDDEN when blocked,
// 429 at 60 an hour, or at 20 unopened messages waiting at the same person.
export const POST = route<{ slug: string; userId: string }>(
  async ({ request, requestId, params }) => {
    const { jar, slug, actorId, collegeId } = await memberContext(request, params.slug, {
      write: true,
    });
    const other = pathUuid(params.userId);
    const body = await readJson(request, dmSendBody);
    const key = readIdempotencyKey(request);
    const result = await withIdempotency(
      { userId: actorId, route: `POST messages ${slug} ${other}`, key, body },
      async () => ({ status: 201, data: await sendMessage(actorId, collegeId, other, body.body) }),
    );
    return jar.applyTo(
      ok(result.data, requestId, {
        status: result.status,
        headers: result.replay ? { "Idempotent-Replay": "true" } : undefined,
      }),
    );
  },
);
