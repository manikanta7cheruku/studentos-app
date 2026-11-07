import { ok, route } from "@/lib/api";
import { pathUuid } from "@/modules/admin/context";
import { meContext } from "@/modules/engagement/context";
import { setSavedOpportunity } from "@/modules/opportunities/opportunities.admin";

// OPP-04 PUT /api/v1/me/saved-opportunities/{id}: save. DELETE: unsave. Both are safe to repeat.
// The listing must be published (or expired) in a college where you are an active member; anything else is 404.
export const PUT = route<{ id: string }>(async ({ request, requestId, params }) => {
  const { jar, userId } = await meContext(request, { write: true });
  return jar.applyTo(ok(await setSavedOpportunity(userId, pathUuid(params.id), true), requestId));
});

export const DELETE = route<{ id: string }>(async ({ request, requestId, params }) => {
  const { jar, userId } = await meContext(request, { write: true });
  return jar.applyTo(ok(await setSavedOpportunity(userId, pathUuid(params.id), false), requestId));
});
