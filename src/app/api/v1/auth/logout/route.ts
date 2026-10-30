import { logoutQuery } from "@/contracts";
import { AppError } from "@/lib/errors";
import { assertSameOrigin, ok, readQuery, route } from "@/lib/api";
import { CookieJar, getCurrentUser } from "@/lib/supabase/request-client";

// AUTH-03 POST /api/v1/auth/logout?all=true. Ends this session, or every session with all=true.
export const POST = route(async ({ request, requestId }) => {
  assertSameOrigin(request);
  const jar = new CookieJar();
  // Sign in is checked first, as docs/API_CONTRACT.md section 1 says. Only then the query.
  const { supabase } = await getCurrentUser(request, jar);
  const query = readQuery(request, logoutQuery);
  const { error } = await supabase.auth.signOut({
    scope: query.all === "true" ? "global" : "local",
  });
  if (error && (error.status ?? 0) >= 500)
    throw new AppError("UPSTREAM_UNAVAILABLE", { cause: error });
  return jar.applyTo(ok({ signed_out: true }, requestId));
});
