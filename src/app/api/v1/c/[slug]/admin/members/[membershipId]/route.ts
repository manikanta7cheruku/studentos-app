import { memberPatchBody } from "@/contracts";
import { ok, readJson, route } from "@/lib/api";
import { adminContext, pathUuid } from "@/modules/admin/context";
import { updateMember } from "@/modules/admin/admin-api.admin";

// ADM-09 PATCH /api/v1/c/{slug}/admin/members/{membershipId}
//   { "role": "moderator" }                                        change the role
//   { "status": "suspended", "reason": "at least 5 characters" }   suspend (reason needed)
//   { "status": "active" }                                         reinstate a suspended member
//   { "status": "left", "reason": "..." }                          remove a member (reason needed)
// 409 if it would leave the college without an active admin, or the move is not allowed from the current status.
// 403 if an admin tries to change their own role or status. 404 if the member is not in this college.
// Writes one audit row (member.role_changed, member.suspended, member.reinstated or member.removed).
export const PATCH = route<{ slug: string; membershipId: string }>(
  async ({ request, requestId, params }) => {
    const { jar, actorId, collegeId } = await adminContext(request, params.slug, { write: true });
    const membershipId = pathUuid(params.membershipId);
    const body = await readJson(request, memberPatchBody);
    const member = await updateMember(actorId, collegeId, membershipId, body, requestId);
    return jar.applyTo(ok({ member }, requestId));
  },
);
