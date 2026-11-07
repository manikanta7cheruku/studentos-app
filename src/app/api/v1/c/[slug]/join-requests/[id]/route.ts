import { ok, route } from "@/lib/api";
import { pathUuid } from "@/modules/admin/context";
import { memberContext } from "@/modules/engagement/context";
import { withdrawJoinRequest } from "@/modules/teamfinder/teamfinder.admin";

// TMF-09 DELETE /api/v1/c/{slug}/join-requests/{id}
// Only the applicant (404 for anyone else). A waiting request is withdrawn. An accepted one is withdrawn too:
// the slot is free again, the author is told, and the withdrawal is written to the audit log.
// 409 if it was already withdrawn, declined or cancelled.
export const DELETE = route<{ slug: string; id: string }>(
  async ({ request, requestId, params }) => {
    const { jar, actorId, collegeId } = await memberContext(request, params.slug, { write: true });
    const result = await withdrawJoinRequest(actorId, collegeId, pathUuid(params.id), requestId);
    return jar.applyTo(ok(result, requestId));
  },
);
