"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { ApiError } from "@/lib/api-client";
import { api, type MyCollege, type PublicCollege } from "@/lib/api/endpoints";
import { useLoad } from "@/lib/use-load";
import { useSession } from "@/features/session/session-provider";

export type JoinContext =
  | { state: "loading" }
  | { state: "missing" }
  | { state: "error"; error: ApiError | null; retry: () => void }
  | { state: "ready"; college: PublicCollege; entry: MyCollege | null };

/**
 * What the join and waiting pages need: the public college and my membership in it (if any). A person who is not
 * signed in is sent to sign in and brought back; `requireSession: false` (the college landing page) lets visitors stay.
 */
export function useJoinContext(slug: string, requireSession = true): JoinContext {
  const session = useSession();
  const branding = useLoad(() => api.colleges.publicBySlug(slug), [slug]);
  const router = useRouter();
  const pathname = usePathname();
  const signedOut = session.status === "signed-out";

  React.useEffect(() => {
    if (requireSession && signedOut) router.replace(`/signin?next=${encodeURIComponent(pathname)}`);
  }, [requireSession, signedOut, router, pathname]);

  const retry = React.useCallback(() => {
    branding.reload();
    void session.refresh();
  }, [branding, session]);

  if (branding.status === "error") {
    if (branding.error instanceof ApiError && branding.error.status === 404) {
      return { state: "missing" };
    }
    return {
      state: "error",
      error: branding.error instanceof ApiError ? branding.error : null,
      retry,
    };
  }
  if (session.status === "error") return { state: "error", error: session.error, retry };
  if (branding.status === "loading" || session.status === "loading") return { state: "loading" };
  if (requireSession && signedOut) return { state: "loading" };
  const entry = session.colleges.find((item) => item.college.slug === slug) ?? null;
  return { state: "ready", college: branding.data, entry };
}
