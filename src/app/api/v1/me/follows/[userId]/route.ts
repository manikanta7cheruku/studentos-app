import { ok, route } from "@/lib/api";
import { pathUuid } from "@/modules/admin/context";
import { meContext } from "@/modules/engagement/context";
import { setFollow } from "@/modules/social/social.admin";

// FOL-01 PUT /api/v1/me/follows/{user_id}: follow a person. One way, no approval. Safe to repeat.
// 400 for yourself, 404 for someone who does not exist or who blocked you. Answers with the counts.
export const PUT = route<{ userId: string }>(async ({ request, requestId, params }) => {
  const { jar, userId } = await meContext(request, { write: true });
  return jar.applyTo(ok(await setFollow(userId, pathUuid(params.userId), true), requestId));
});

// FOL-01 DELETE: stop following. Safe to repeat.
export const DELETE = route<{ userId: string }>(async ({ request, requestId, params }) => {
  const { jar, userId } = await meContext(request, { write: true });
  return jar.applyTo(ok(await setFollow(userId, pathUuid(params.userId), false), requestId));
});
