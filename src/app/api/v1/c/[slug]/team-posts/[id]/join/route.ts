import { teamJoinBody } from "@/contracts";
import { ok, readJson, route } from "@/lib/api";
import { readIdempotencyKey, withIdempotency } from "@/lib/idempotency.admin";
import { pathUuid } from "@/modules/admin/context";
import { memberContext } from "@/modules/engagement/context";
import { joinOpenTeamPost } from "@/modules/teamfinder/teamfinder.admin";

// TMF-11 POST /api/v1/c/{slug}/team-posts/{id}/join (IDEM)   { "role_id": "optional" }
// One tap join for a plan whose host chose open join. You are in at once and the host is told. Without role_id the first
// role with room is taken. 403 for a plan that needs approval or for the host, 409 SLOTS_FULL or CONFLICT (closed),
// 409 ALREADY_REQUESTED when you are already in.
export const POST = route<{ slug: string; id: string }>(async ({ request, requestId, params }) => {
  const { jar, slug, actorId, collegeId } = await memberContext(request, params.slug, {
    write: true,
    module: "collaborate",
  });
  const post = pathUuid(params.id);
  const body = await readJson(request, teamJoinBody);
  const key = readIdempotencyKey(request);
  const result = await withIdempotency(
    { userId: actorId, route: `POST team-posts/${post}/join ${slug}`, key, body },
    async () => ({
      status: 200,
      data: await joinOpenTeamPost(actorId, collegeId, post, body.role_id),
    }),
  );
  return jar.applyTo(
    ok(result.data, requestId, {
      headers: result.replay ? { "Idempotent-Replay": "true" } : undefined,
    }),
  );
});
