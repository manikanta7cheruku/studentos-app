"use client";

import * as React from "react";
import { ApiError } from "@/lib/api-client";
import { api, type MyCollege } from "@/lib/api/endpoints";
import { homePath } from "@/lib/home-path";
import { forgetThisDevice } from "@/features/notifications/push-device";

// Who is signed in, and which colleges they belong to. One request (GET /me/memberships) answers both:
// 401 means signed out, a list (possibly empty) means signed in. Screens read it with useSession().
// Public pages (the landing page) do not mount this provider, so a visitor never triggers a 401 there.

export type SessionStatus = "loading" | "signed-out" | "signed-in" | "error";

type SessionValue = {
  status: SessionStatus;
  colleges: MyCollege[];
  error: ApiError | null;
  /** Ask the server again (after joining a college, after an approval, after leaving one). */
  refresh: () => Promise<void>;
  /** End the session on the server, then load the home page fresh, so no screen keeps the old person's data. */
  signOut: () => Promise<void>;
};

const SessionContext = React.createContext<SessionValue | null>(null);

const LAST_COLLEGE_KEY = "studentos:last-college";

/** The college the person used last, so "/me" style links know where to go. Safe if storage is blocked. */
export function rememberCollege(slug: string): void {
  try {
    window.localStorage.setItem(LAST_COLLEGE_KEY, slug);
  } catch {
    // private window or blocked storage: the app still works
  }
}

export function lastCollege(): string | null {
  try {
    return window.localStorage.getItem(LAST_COLLEGE_KEY);
  } catch {
    return null;
  }
}

type Snapshot = { status: SessionStatus; colleges: MyCollege[]; error: ApiError | null };

async function fetchSession(): Promise<Snapshot> {
  try {
    const colleges = await api.colleges.mine();
    return { status: "signed-in", colleges, error: null };
  } catch (caught) {
    if (caught instanceof ApiError && caught.isSignedOut) {
      return { status: "signed-out", colleges: [], error: null };
    }
    return { status: "error", colleges: [], error: caught instanceof ApiError ? caught : null };
  }
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [snapshot, setSnapshot] = React.useState<Snapshot>({
    status: "loading",
    colleges: [],
    error: null,
  });

  React.useEffect(() => {
    let ignore = false;
    void fetchSession().then((next) => {
      if (!ignore) setSnapshot(next);
    });
    return () => {
      ignore = true;
    };
  }, []);

  const refresh = React.useCallback(async () => {
    setSnapshot(await fetchSession());
  }, []);

  // A person who comes back to the tab sees an ended session at once, not at the next click.
  React.useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") void fetchSession().then(setSnapshot);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  const signOut = React.useCallback(async () => {
    await forgetThisDevice();
    try {
      await api.auth.logout();
    } catch {
      // The cookie may already be gone. Either way this browser is signed out now.
    }
    // A full page load, not a client navigation: Next keeps screens you left alive in the background.
    window.location.replace("/");
  }, []);

  const value = React.useMemo<SessionValue>(
    () => ({ ...snapshot, refresh, signOut }),
    [snapshot, refresh, signOut],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const value = React.useContext(SessionContext);
  if (!value) throw new Error("useSession must be used inside <SessionProvider>");
  return value;
}

/** Where to send a person who just signed in and has no `next` address. */
export function homeFor(colleges: MyCollege[]): string {
  const active = colleges.filter((item) => item.membership.status === "active");
  const remembered = lastCollege();
  if (remembered && colleges.some((item) => item.college.slug === remembered)) {
    const item = colleges.find((c) => c.college.slug === remembered)!;
    return item.membership.status === "active" ? homePath(remembered) : `/c/${remembered}/pending`;
  }
  if (active.length >= 1) return homePath(active[0]!.college.slug);
  if (colleges.length >= 1) return `/c/${colleges[0]!.college.slug}/pending`;
  return "/find";
}
