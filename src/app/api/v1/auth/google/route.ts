import { route } from "@/lib/api";
import { safeNext } from "@/lib/safe-next";
import { serverEnv } from "@/lib/env";
import { CookieJar, createUserClient } from "@/lib/supabase/request-client";

// AUTH-05 GET /api/v1/auth/google?next=/path
// Starts "Continue with Google": asks Supabase Auth for the Google address, keeps the one time proof (PKCE) in a
// cookie, and sends the browser there with a redirect. If Google sign in is not switched on in this environment, the
// person goes back to the sign in page with a plain message instead of an error page.
export const GET = route(async ({ request }) => {
  const appUrl = serverEnv().NEXT_PUBLIC_APP_URL;
  const next = safeNext(new URL(request.url).searchParams.get("next"));
  const back = (reason: string) => Response.redirect(`${appUrl}/signin?error=${reason}`, 302);

  // Switched on per environment (NEXT_PUBLIC_GOOGLE_SIGNIN=enabled) once Google is set up in Supabase. The sign in
  // screen shows the button on the same switch.
  if (process.env.NEXT_PUBLIC_GOOGLE_SIGNIN !== "enabled") return back("google_unavailable");

  const jar = new CookieJar();
  const supabase = createUserClient(request, jar);
  const callback = new URL("/api/v1/auth/google/callback", appUrl);
  if (next) callback.searchParams.set("next", next);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: callback.toString(), skipBrowserRedirect: true },
  });
  if (error || !data.url) return back("google_unavailable");

  return jar.applyTo(new Response(null, { status: 302, headers: { Location: data.url } }));
});
