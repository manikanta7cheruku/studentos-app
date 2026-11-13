import { debateArgumentVoteBody } from "@/contracts";
import { ok, readJson, route } from "@/lib/api";
import { pathUuid } from "@/modules/admin/context";
import { memberContext } from "@/modules/engagement/context";
import { voteArgument } from "@/modules/debates/debates.admin";

// DEB-07 PUT /api/v1/c/{slug}/debates/{id}/arguments/{argId}/vote   { "value": 1 | 0 }
// A strong point, or take it back. Safe to repeat. Not your own argument (400). 409 after the end.
export const PUT = route<{ slug: string; id: string; argId: string }>(
  async ({ request, requestId, params }) => {
    const { jar, actorId, collegeId } = await memberContext(request, params.slug, { write: true });
    const body = await readJson(request, debateArgumentVoteBody);
    return jar.applyTo(
      ok(
        await voteArgument(actorId, collegeId, pathUuid(params.argId), body.value === 1),
        requestId,
      ),
    );
  },
);
