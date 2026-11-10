import { applicationStatusBody } from "@/contracts";
import { ok, readJson, route } from "@/lib/api";
import { pathUuid } from "@/modules/admin/context";
import { meContext } from "@/modules/engagement/context";
import { changeApplicationStatus, parseIfMatch } from "@/modules/applications/applications.admin";

// APP-04 POST /api/v1/me/applications/{id}/status   { "status": "interview", "note": "optional" }   If-Match: <version>
// Changes the status and writes one event (from, to, time, note) in one step. Setting "applied" fills the applied
// date the first time. 409 CONFLICT when it already has that status, 409 VERSION_CONFLICT for an old version.
export const POST = route<{ id: string }>(async ({ request, requestId, params }) => {
  const { jar, userId } = await meContext(request, { write: true });
  const id = pathUuid(params.id);
  const body = await readJson(request, applicationStatusBody);
  const version = parseIfMatch(request.headers.get("if-match"));
  return jar.applyTo(
    ok(await changeApplicationStatus(userId, id, body.status, body.note, version), requestId),
  );
});
