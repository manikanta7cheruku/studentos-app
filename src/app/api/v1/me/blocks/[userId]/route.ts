import { ok, route } from "@/lib/api";
import { pathUuid } from "@/modules/admin/context";
import { meContext } from "@/modules/engagement/context";
import { blockUser, unblockUser } from "@/modules/engagement/engagement.admin";

// RPT-04 PUT /api/v1/me/blocks/{user_id}: block a person. Safe to repeat.
// The person must be an active member of a college you are active in (404 otherwise, so ids of strangers
// are never confirmed). You cannot block yourself (400).
export const PUT = route<{ userId: string }>(async ({ request, requestId, params }) => {
  const { jar, userId } = await meContext(request, { write: true });
  await blockUser(userId, pathUuid(params.userId));
  return jar.applyTo(ok({ blocked: true }, requestId));
});

// RPT-04 DELETE: unblock. Safe to repeat.
export const DELETE = route<{ userId: string }>(async ({ request, requestId, params }) => {
  const { jar, userId } = await meContext(request, { write: true });
  await unblockUser(userId, pathUuid(params.userId));
  return jar.applyTo(ok({ blocked: false }, requestId));
});
