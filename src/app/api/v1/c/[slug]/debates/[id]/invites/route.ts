import { debateInvitesBody } from "@/contracts";
import { ok, readJson, route } from "@/lib/api";
import { pathUuid } from "@/modules/admin/context";
import { memberContext } from "@/modules/engagement/context";
import { inviteToDebate } from "@/modules/debates/debates.admin";

// DEB-10 PUT /api/v1/c/{slug}/debates/{id}/invites   { "user_ids": ["..."] }
// The author invites more people to an invite only debate (50 in all). Already invited people are skipped. 404 for anyone who is not
// the author, 400 for a public debate or too many people.
export const PUT = route<{ slug: string; id: string }>(async ({ request, requestId, params }) => {
  const { jar, actorId, collegeId } = await memberContext(request, params.slug, { write: true });
  const body = await readJson(request, debateInvitesBody);
  return jar.applyTo(
    ok(await inviteToDebate(actorId, collegeId, pathUuid(params.id), body.user_ids), requestId),
  );
});
