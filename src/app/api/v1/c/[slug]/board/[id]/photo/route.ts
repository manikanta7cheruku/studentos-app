import { boardPhotoBody } from "@/contracts";
import { ok, readJson, route } from "@/lib/api";
import { pathUuid } from "@/modules/admin/context";
import { memberContext } from "@/modules/engagement/context";
import { setBoardPhoto } from "@/modules/community/photos.admin";

// BRD-08 PUT /api/v1/c/{slug}/board/{id}/photo   { "path": "<path from PHO-01>" | null }
// The author attaches the picture to their post, or removes it with null. 403 for anyone else, 400 for a path that does not
// start with my own id.
export const PUT = route<{ slug: string; id: string }>(async ({ request, requestId, params }) => {
  const { jar, actorId, collegeId } = await memberContext(request, params.slug, { write: true });
  const body = await readJson(request, boardPhotoBody);
  return jar.applyTo(
    ok(await setBoardPhoto(actorId, collegeId, pathUuid(params.id), body.path), requestId),
  );
});
