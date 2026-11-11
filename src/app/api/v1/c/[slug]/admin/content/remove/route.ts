import { contentRemoveBody } from "@/contracts";
import { ok, readJson, route } from "@/lib/api";
import { modContext } from "@/modules/engagement/context";
import { removeContent } from "@/modules/community/content.admin";

// ADM-13 POST /api/v1/c/{slug}/admin/content/remove   { "kind": "plan", "id": "...", "reason": "spam", "note": "optional" }
// A moderator or admin removes a plan, thought, event or listing. The author gets a notification with the reason
// (and the note). The removal is written to the audit log. 404 for an item of another college.
export const POST = route<{ slug: string }>(async ({ request, requestId, params }) => {
  const { jar, actorId, collegeId } = await modContext(request, params.slug, { write: true });
  const body = await readJson(request, contentRemoveBody);
  return jar.applyTo(ok(await removeContent(actorId, collegeId, body), requestId));
});
