import { ok, route } from "@/lib/api";
import { pathUuid } from "@/modules/admin/context";
import { memberContext } from "@/modules/engagement/context";
import { removeArgument } from "@/modules/debates/debates.admin";

// DEB-09 DELETE /api/v1/c/{slug}/debates/{id}/arguments/{argId}: the author, or a moderator or admin (audit logged).
export const DELETE = route<{ slug: string; id: string; argId: string }>(
  async ({ request, requestId, params }) => {
    const { jar, actorId, collegeId } = await memberContext(request, params.slug, { write: true });
    return jar.applyTo(
      ok(await removeArgument(actorId, collegeId, pathUuid(params.argId)), requestId),
    );
  },
);
