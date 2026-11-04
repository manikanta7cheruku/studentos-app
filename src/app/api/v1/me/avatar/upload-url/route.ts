import { avatarUploadUrlBody } from "@/contracts";
import { assertSameOrigin, ok, readJson, route } from "@/lib/api";
import { CookieJar, getCurrentUser } from "@/lib/supabase/request-client";
import { createAvatarUploadUrl } from "@/modules/profile";

// PRF-04 POST /api/v1/me/avatar/upload-url: Generate signed avatar upload URL
export const POST = route(async ({ request, requestId }) => {
  assertSameOrigin(request);
  const jar = new CookieJar();
  const { user, supabase } = await getCurrentUser(request, jar);
  const body = await readJson(request, avatarUploadUrlBody);
  const data = await createAvatarUploadUrl(supabase, user.id, body);
  return jar.applyTo(ok(data, requestId));
});
