import { ok, route } from "@/lib/api";
import { pathUuid } from "@/modules/admin/context";
import { memberContext } from "@/modules/engagement/context";
import { closeTeamPost } from "@/modules/teamfinder/teamfinder.admin";

// TMF-05 POST /api/v1/c/{slug}/team-posts/{id}/close
// Only the author. Waiting requests are cancelled and their applicants are told. 409 if it is not open.
export const POST = route<{ slug: string; id: string }>(async ({ request, requestId, params }) => {
  const { jar, actorId, collegeId } = await memberContext(request, params.slug, {
    write: true,
    module: "collaborate",
  });
  const post = await closeTeamPost(actorId, collegeId, pathUuid(params.id));
  return jar.applyTo(ok(post, requestId));
});
