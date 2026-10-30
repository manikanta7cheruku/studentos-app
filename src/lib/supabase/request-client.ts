import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { createServerClient, parseCookieHeader, serializeCookieHeader } from "@supabase/ssr";
import { bearerToken } from "../api";
import { AppError } from "../errors";
import { serverEnv } from "../env";

type PendingCookie = { name: string; value: string; options: Record<string, unknown> };

// Cookies the Supabase client wants to set. We copy them onto the response ourselves,
// so the code works in a Next.js route handler and in plain tests.
export class CookieJar {
  readonly pending: PendingCookie[] = [];

  applyTo(response: Response): Response {
    const secure = new URL(serverEnv().NEXT_PUBLIC_APP_URL).protocol === "https:";
    for (const cookie of this.pending) {
      response.headers.append(
        "Set-Cookie",
        serializeCookieHeader(cookie.name, cookie.value, {
          ...cookie.options,
          path: "/",
          httpOnly: true,
          sameSite: "lax",
          secure,
        }),
      );
    }
    return response;
  }
}

// A Supabase client that acts as the signed-in user (the database applies Row Level Security).
export function createUserClient(request: Request, jar: CookieJar): SupabaseClient {
  const env = serverEnv();
  const token = bearerToken(request);
  if (token) {
    return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
  }
  return createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () =>
        parseCookieHeader(request.headers.get("cookie") ?? "").map((cookie) => ({
          name: cookie.name,
          value: cookie.value ?? "",
        })),
      setAll: (cookies) => {
        for (const { name, value, options } of cookies) {
          jar.pending.push({ name, value, options: { ...options } });
        }
      },
    },
  });
}

// A client that is not signed in and keeps nothing. Used to send and check codes for an address.
export function createAnonClient(): SupabaseClient {
  const env = serverEnv();
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

export type CurrentUser = { user: User; supabase: SupabaseClient };

// Who is calling? The server asks Supabase Auth to check the token (it does not just decode it).
export async function getCurrentUser(request: Request, jar: CookieJar): Promise<CurrentUser> {
  const supabase = createUserClient(request, jar);
  const token = bearerToken(request);
  const { data, error } = token
    ? await supabase.auth.getUser(token)
    : await supabase.auth.getUser();
  if (error || !data.user) {
    if (error && (error.status ?? 0) >= 500)
      throw new AppError("UPSTREAM_UNAVAILABLE", { cause: error });
    throw new AppError("UNAUTHENTICATED");
  }
  return { user: data.user, supabase };
}
