import { ok, route } from "@/lib/api";
import { pathUuid } from "@/modules/admin/context";
import { memberContext } from "@/modules/engagement/context";
import { listParticipants } from "@/modules/teamfinder/teamfinder.admin";

// TMF-12 GET /api/v1/c/{slug}/team-posts/{id}/participants
// The host and the people who joined see who is in (the host first). Everyone else gets an empty list.
export const GET = route<{ slug: string; id: string }>(async ({ request, requestId, params }) => {
  const { jar, actorId, collegeId } = await memberContext(request, params.slug, {
    module: "collaborate",
  });
  return jar.applyTo(
    ok(await listParticipants(actorId, collegeId, pathUuid(params.id)), requestId),
  );
});
