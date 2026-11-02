import { ok, route } from "@/lib/api";
import { adminContext, pathUuid } from "@/modules/admin/context";
import { revokeInvite } from "@/modules/admin/admin-api.admin";

// ADM-05 DELETE /api/v1/c/{slug}/admin/invites/{id}: revoke an invite (it stops working at once).
// People who already joined with it stay members. Writes one audit row (invite.revoked).
// 404 if the invite is not in this college, 409 if it is already revoked.
export const DELETE = route<{ slug: string; id: string }>(
  async ({ request, requestId, params }) => {
    const { jar, actorId, collegeId } = await adminContext(request, params.slug, { write: true });
    const invite = await revokeInvite(actorId, collegeId, pathUuid(params.id), requestId);
    return jar.applyTo(ok({ invite }, requestId));
  },
);
