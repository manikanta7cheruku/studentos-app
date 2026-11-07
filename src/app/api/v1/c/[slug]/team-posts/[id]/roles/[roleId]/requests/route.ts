import { joinRequestBody } from "@/contracts";
import { ok, readJson, route } from "@/lib/api";
import { readIdempotencyKey, withIdempotency } from "@/lib/idempotency.admin";
import { pathUuid } from "@/modules/admin/context";
import { memberContext } from "@/modules/engagement/context";
import { createJoinRequest } from "@/modules/teamfinder/teamfinder.admin";

// TMF-06 POST /api/v1/c/{slug}/team-posts/{id}/roles/{roleId}/requests (IDEM)   { "message": "optional, up to 500" }
// 409 ALREADY_REQUESTED (one live request per role), 409 SLOTS_FULL, 409 CONFLICT (post not open or expired),
// 403 FORBIDDEN (your own post), 404 (post hidden, or you and the author blocked each other),
// 429 at 10 waiting requests. The author gets a notification.
export const POST = route<{ slug: string; id: string; roleId: string }>(
  async ({ request, requestId, params }) => {
    const { jar, slug, actorId, collegeId } = await memberContext(request, params.slug, {
      write: true,
      module: "collaborate",
    });
    const postId = pathUuid(params.id);
    const roleId = pathUuid(params.roleId);
    const body = await readJson(request, joinRequestBody);
    const key = readIdempotencyKey(request);
    const result = await withIdempotency(
      { userId: actorId, route: `POST join-request ${slug} ${roleId}`, key, body },
      async () => ({
        status: 201,
        data: await createJoinRequest(actorId, collegeId, postId, roleId, body.message),
      }),
    );
    return jar.applyTo(
      ok(result.data, requestId, {
        status: result.status,
        headers: result.replay ? { "Idempotent-Replay": "true" } : undefined,
      }),
    );
  },
);
