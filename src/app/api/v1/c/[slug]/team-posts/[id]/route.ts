import { teamPostPatchBody } from "@/contracts";
import { ok, readJson, route } from "@/lib/api";
import { pathUuid } from "@/modules/admin/context";
import { memberContext } from "@/modules/engagement/context";
import { getTeamPost, updateTeamPost } from "@/modules/teamfinder/teamfinder.admin";

// TMF-03 GET /api/v1/c/{slug}/team-posts/{id}
// `team_link` is null unless you are the author or an accepted member. `pending_requests` is only for the author.
export const GET = route<{ slug: string; id: string }>(async ({ request, requestId, params }) => {
  const { jar, actorId, collegeId } = await memberContext(request, params.slug);
  const post = await getTeamPost(actorId, collegeId, pathUuid(params.id));
  return jar.applyTo(ok(post, requestId));
});

// TMF-04 PATCH /api/v1/c/{slug}/team-posts/{id}
// Only the author, only while the post is open. Send only what changes. null clears a link or the deadline.
export const PATCH = route<{ slug: string; id: string }>(async ({ request, requestId, params }) => {
  const { jar, actorId, collegeId } = await memberContext(request, params.slug, { write: true });
  const patch = await readJson(request, teamPostPatchBody);
  const post = await updateTeamPost(actorId, collegeId, pathUuid(params.id), patch);
  return jar.applyTo(ok(post, requestId));
});
