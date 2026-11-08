import { AVATAR_MAX_BYTES } from "@/contracts";
import { assertSameOrigin, ok, readBodyCapped, route } from "@/lib/api";
import { AppError } from "@/lib/errors";
import { CookieJar, getCurrentUser } from "@/lib/supabase/request-client";
import { limitWrites } from "@/lib/write-limit";
import { uploadAvatar } from "@/modules/profile";

// A multipart body is a little bigger than the file inside it.
const MAX_BODY_BYTES = AVATAR_MAX_BYTES + 100 * 1024;

// PRF-04 POST /api/v1/me/avatar: direct avatar upload (the file as the body, or a multipart form field "file").
// The body is cut off at the size limit while it is read (413), then checked by its real bytes: only
// JPEG, PNG, WebP, GIF or AVIF, at most 2 MB. The upload must succeed before the profile points to it.
export const POST = route(async ({ request, requestId }) => {
  assertSameOrigin(request);
  const jar = new CookieJar();
  const { user, supabase } = await getCurrentUser(request, jar);
  await limitWrites(user.id);

  const bytes = await readBodyCapped(request, MAX_BODY_BYTES);
  const contentType = request.headers.get("content-type") ?? "";
  let buffer: Uint8Array = bytes;

  if (contentType.includes("multipart/form-data")) {
    let file: FormDataEntryValue | null;
    try {
      const form = await new Response(new Blob([bytes]), {
        headers: { "content-type": contentType },
      }).formData();
      file = form.get("file");
    } catch {
      file = null;
    }
    if (!file || typeof file === "string") {
      throw new AppError("VALIDATION_FAILED", {
        details: { fields: [{ path: "file", message: "Please provide a valid file." }] },
      });
    }
    buffer = new Uint8Array(await file.arrayBuffer());
  }

  const result = await uploadAvatar(supabase, user.id, buffer);
  return jar.applyTo(ok(result, requestId));
});
