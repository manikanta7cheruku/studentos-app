import { assertSameOrigin, ok, route } from "@/lib/api";
import { AppError } from "@/lib/errors";
import { CookieJar, getCurrentUser } from "@/lib/supabase/request-client";
import { uploadAvatar } from "@/modules/profile";

// POST /api/v1/me/avatar: Direct avatar upload with server-side magic byte and size validation
export const POST = route(async ({ request, requestId }) => {
  assertSameOrigin(request);
  const jar = new CookieJar();
  const { user, supabase } = await getCurrentUser(request, jar);

  const contentType = request.headers.get("content-type") ?? "";
  let buffer: Uint8Array;

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!file || typeof file === "string") {
      throw new AppError("VALIDATION_FAILED", {
        details: { fields: [{ path: "file", message: "Please provide a valid file." }] },
      });
    }
    const arrayBuffer = await file.arrayBuffer();
    buffer = new Uint8Array(arrayBuffer);
  } else {
    const arrayBuffer = await request.arrayBuffer();
    buffer = new Uint8Array(arrayBuffer);
  }

  const result = await uploadAvatar(supabase, user.id, buffer);
  return jar.applyTo(ok(result, requestId));
});
