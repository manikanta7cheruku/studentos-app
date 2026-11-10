import { applicationPatchBody } from "@/contracts";
import { ok, readJson, route } from "@/lib/api";
import { pathUuid } from "@/modules/admin/context";
import { meContext } from "@/modules/engagement/context";
import {
  deleteApplication,
  getApplication,
  parseIfMatch,
  updateApplication,
} from "@/modules/applications/applications.admin";

// APP-03 GET /api/v1/me/applications/{id}: one application with its status history. 404 for anyone else's.
export const GET = route<{ id: string }>(async ({ request, requestId, params }) => {
  const { jar, userId } = await meContext(request);
  return jar.applyTo(ok(await getApplication(userId, pathUuid(params.id)), requestId));
});

// APP-03 PATCH /api/v1/me/applications/{id}   If-Match: <version>
// Only the keys you send change. 409 VERSION_CONFLICT when the version is not the current one (the screen then
// reloads). The status is changed with APP-04.
export const PATCH = route<{ id: string }>(async ({ request, requestId, params }) => {
  const { jar, userId } = await meContext(request, { write: true });
  const id = pathUuid(params.id);
  const body = await readJson(request, applicationPatchBody);
  const version = parseIfMatch(request.headers.get("if-match"));
  return jar.applyTo(ok(await updateApplication(userId, id, body, version), requestId));
});

// APP-03 DELETE /api/v1/me/applications/{id}: gone for good, with its history.
export const DELETE = route<{ id: string }>(async ({ request, requestId, params }) => {
  const { jar, userId } = await meContext(request, { write: true });
  return jar.applyTo(ok(await deleteApplication(userId, pathUuid(params.id)), requestId));
});
