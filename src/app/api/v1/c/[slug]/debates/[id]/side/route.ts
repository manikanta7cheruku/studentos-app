import { debateSideBody } from "@/contracts";
import { ok, readJson, route } from "@/lib/api";
import { pathUuid } from "@/modules/admin/context";
import { memberContext } from "@/modules/engagement/context";
import { pickSide } from "@/modules/debates/debates.admin";

// DEB-04 PUT /api/v1/c/{slug}/debates/{id}/side   { "side": 0 | 1 }
// Join a side, or change it while the debate is live. Safe to repeat. 409 after the end. Answers with the debate.
export const PUT = route<{ slug: string; id: string }>(async ({ request, requestId, params }) => {
  const { jar, actorId, collegeId } = await memberContext(request, params.slug, { write: true });
  const body = await readJson(request, debateSideBody);
  return jar.applyTo(
    ok(await pickSide(actorId, collegeId, pathUuid(params.id), body.side), requestId),
  );
});
