import { joinRequestDecisionBody } from "@/contracts";
import { ok, readJson, route } from "@/lib/api";
import { readIdempotencyKey, withIdempotency } from "@/lib/idempotency.admin";
import { pathUuid } from "@/modules/admin/context";
import { memberContext } from "@/modules/engagement/context";
import { decideJoinRequest } from "@/modules/teamfinder/teamfinder.admin";

// TMF-08 POST /api/v1/c/{slug}/join-requests/{id}/decision (IDEM)   { "decision": "accepted" | "declined", "note": "optional" }
// Only the author of the post (403 for anyone else). 409 SLOTS_FULL when the role has no free slot: two accepts at once
// for the last slot give exactly one 200 and one 409. 409 CONFLICT if already decided or the post is no longer open.
// When every role is full the post becomes `filled` and the other waiting requests are cancelled. The applicant is told.
export const POST = route<{ slug: string; id: string }>(async ({ request, requestId, params }) => {
  const { jar, slug, actorId, collegeId } = await memberContext(request, params.slug, {
    write: true,
  });
  const id = pathUuid(params.id);
  const body = await readJson(request, joinRequestDecisionBody);
  const key = readIdempotencyKey(request);
  const result = await withIdempotency(
    { userId: actorId, route: `POST join-request-decision ${slug} ${id}`, key, body },
    async () => ({ status: 200, data: await decideJoinRequest(actorId, collegeId, id, body) }),
  );
  return jar.applyTo(
    ok(result.data, requestId, {
      status: result.status,
      headers: result.replay ? { "Idempotent-Replay": "true" } : undefined,
    }),
  );
});
