import { photoUploadUrlBody } from "@/contracts";
import { ok, readJson, route } from "@/lib/api";
import { memberContext } from "@/modules/engagement/context";
import { createPhotoUploadUrl } from "@/modules/community/photos.admin";

// PHO-01 POST /api/v1/c/{slug}/photos/upload-url   { "content_type": "image/webp", "file_size": 180000 }
// A one time link to upload one picture to (at most 1 MB; the phone shrinks it first). The `path` starts with my own id.
// Attach it to a market or lost and found post with BRD-08. 400 for a picture over 1 MB or a type that is not WebP, JPEG or PNG.
export const POST = route<{ slug: string }>(async ({ request, requestId, params }) => {
  const { jar, actorId } = await memberContext(request, params.slug, { write: true });
  const body = await readJson(request, photoUploadUrlBody);
  return jar.applyTo(ok(await createPhotoUploadUrl(actorId, body), requestId, { status: 201 }));
});
