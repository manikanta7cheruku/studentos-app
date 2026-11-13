import { logoutQuery } from "@/contracts";
import { AppError } from "@/lib/errors";
import { assertSameOrigin, ok, readQuery, route } from "@/lib/api";
import { limitWrites } from "@/lib/write-limit";
import { removeAllPushSubscriptions } from "@/modules/push/push.admin";
import { CookieJar, getCurrentUser } from "@/lib/supabase/request-client";

// AUTH-03 POST /api/v1/auth/logout?all=true. Ends this session, or every session with all=true.
export const POST = route(async ({ request, requestId }) => {
  assertSameOrigin(request);
  const jar = new CookieJar();
  // Sign in is checked first, as docs/API_CONTRACT.md section 1 says. Only then the query.
  const { user, supabase } = await getCurrentUser(request, jar);
  await limitWrites(user.id);
  const query = readQuery(request, logoutQuery);
  // Signing out everywhere also stops alerts on every device.
  if (query.all === "true") await removeAllPushSubscriptions(user.id);
  const { error } = await supabase.auth.signOut({
    scope: query.all === "true" ? "global" : "local",
  });
  if (error && (error.status ?? 0) >= 500)
    throw new AppError("UPSTREAM_UNAVAILABLE", { cause: error });
  return jar.applyTo(ok({ signed_out: true }, requestId));
});
