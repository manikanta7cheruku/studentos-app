import { verificationDecisionBody } from "@/contracts";
import { ok, readJson, route } from "@/lib/api";
import { readIdempotencyKey, withIdempotency } from "@/lib/idempotency.admin";
import { adminContext, pathUuid } from "@/modules/admin/context";
import { decideVerification } from "@/modules/admin/admin-api.admin";

// ADM-07 POST /api/v1/c/{slug}/admin/verification-requests/{id}/decision (IDEM)
//   { "decision": "approved" }  or  { "decision": "rejected", "reason": "at least 5 characters" }
// Approve: the member becomes active at level 2. Reject: the member is marked rejected, with the reason.
// 403 if the admin decides their own request. 409 if it was already decided (the screen is out of date).
// 404 if the request is not in this college. Writes one audit row (member.approved or member.rejected).
export const POST = route<{ slug: string; id: string }>(async ({ request, requestId, params }) => {
  const { jar, slug, actorId, collegeId } = await adminContext(request, params.slug, {
    write: true,
  });
  const id = pathUuid(params.id);
  const body = await readJson(request, verificationDecisionBody);
  const key = readIdempotencyKey(request);

  const result = await withIdempotency(
    { userId: actorId, route: `POST admin/decision ${slug} ${id}`, key, body },
    async () => {
      const data = await decideVerification(
        actorId,
        collegeId,
        id,
        {
          decision: body.decision,
          reason: body.decision === "rejected" ? body.reason : body.note,
        },
        requestId,
      );
      return { status: 200, data };
    },
  );
  return jar.applyTo(
    ok(result.data, requestId, {
      status: result.status,
      headers: result.replay ? { "Idempotent-Replay": "true" } : undefined,
    }),
  );
});
