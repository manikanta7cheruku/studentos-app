import { route } from "@/lib/api";
import { safeNext } from "@/lib/safe-next";
import { serverEnv } from "@/lib/env";
import { CookieJar, createUserClient } from "@/lib/supabase/request-client";

// AUTH-06 GET /api/v1/auth/google/callback?code=...&next=/path
// Where Google sends the person back. The one time code is exchanged for a session (cookies), then the person goes
// to `next`, or to the home page when there is none. Any problem sends them to the sign in page with a plain reason.
export const GET = route(async ({ request }) => {
  const appUrl = serverEnv().NEXT_PUBLIC_APP_URL;
  const url = new URL(request.url);
  const back = (reason: string) => Response.redirect(`${appUrl}/signin?error=${reason}`, 302);

  if (url.searchParams.get("error")) return back("google_cancelled");
  const code = url.searchParams.get("code");
  if (!code) return back("google_failed");

  const jar = new CookieJar();
  const supabase = createUserClient(request, jar);
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return back("google_failed");

  const next = safeNext(url.searchParams.get("next")) ?? "/";
  return jar.applyTo(
    new Response(null, { status: 302, headers: { Location: `${appUrl}${next}` } }),
  );
});
