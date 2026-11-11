import { boardStatusBody } from "@/contracts";
import { ok, readJson, route } from "@/lib/api";
import { pathUuid } from "@/modules/admin/context";
import { memberContext } from "@/modules/engagement/context";
import { setBoardStatus } from "@/modules/community/community.admin";

// BRD-04 POST /api/v1/c/{slug}/board/{id}/status   { "status": "open" | "resolved" }
// Only the author. Resolved means returned, sold or given away. 404 for anyone else.
export const POST = route<{ slug: string; id: string }>(async ({ request, requestId, params }) => {
  const { jar, actorId, collegeId } = await memberContext(request, params.slug, { write: true });
  const body = await readJson(request, boardStatusBody);
  return jar.applyTo(
    ok(await setBoardStatus(actorId, collegeId, pathUuid(params.id), body.status), requestId),
  );
});
