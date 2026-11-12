"use client";

import * as React from "react";
import { ApiError } from "@/lib/api-client";
import { api, type MyCollege, type Profile, type PublicCollege } from "@/lib/api/endpoints";
import { useLoad } from "@/lib/use-load";
import { rememberCollege, useSession } from "@/features/session/session-provider";

// Everything a screen inside one college needs: the college itself, my membership, which tabs are on, how many
// notifications are unread, and my own name and picture for the shell. Loaded once and shared.

export type CollegeContextValue = {
  slug: string;
  college: PublicCollege;
  membership: MyCollege["membership"];
  isModerator: boolean;
  unread: number;
  refreshUnread: () => Promise<void>;
  profile: (Pick<Profile, "display_name" | "avatar_url"> & { onboarded: boolean }) | null;
  refreshProfile: () => Promise<void>;
};

const CollegeContext = React.createContext<CollegeContextValue | null>(null);

export function useCollege(): CollegeContextValue {
  const value = React.useContext(CollegeContext);
  if (!value) throw new Error("useCollege must be used inside <CollegeProvider>");
  return value;
}

export type CollegeLoad =
  | { state: "loading" }
  | { state: "missing" }
  | { state: "error"; error: ApiError | null; retry: () => void }
  | { state: "signed-out" }
  | { state: "needs-join" }
  | { state: "needs-approval" }
  | { state: "ready"; value: CollegeContextValue };

const UNREAD_REFRESH_MS = 60_000;

/** Loads the public college, finds my membership in the session, and keeps the unread count and my profile fresh. */
export function useCollegeLoad(slug: string): CollegeLoad {
  const session = useSession();
  const branding = useLoad(() => api.colleges.publicBySlug(slug), [slug]);
  const [unread, setUnread] = React.useState(0);
  const [profile, setProfile] = React.useState<CollegeContextValue["profile"]>(null);

  const entry = session.colleges.find((item) => item.college.slug === slug);
  const active = entry?.membership.status === "active";

  const refreshUnread = React.useCallback(async () => {
    try {
      const { meta } = await api.notifications.list({ limit: 1 });
      setUnread(Number(meta.unread_count ?? 0));
    } catch {
      // The badge is a convenience. A failed refresh keeps the last number.
    }
  }, []);

  const refreshProfile = React.useCallback(async () => {
    try {
      const mine = await api.profile.get();
      setProfile({
        display_name: mine.display_name,
        avatar_url: mine.avatar_url,
        onboarded: mine.onboarded,
      });
    } catch {
      // The shell falls back to "You" until the next try.
    }
  }, []);

  React.useEffect(() => {
    if (!active) return;
    rememberCollege(slug);
    let stop = false;
    const tick = () =>
      api.notifications
        .list({ limit: 1 })
        .then(({ meta }) => {
          if (!stop) setUnread(Number(meta.unread_count ?? 0));
        })
        .catch(() => undefined);
    void tick();
    api.profile
      .get()
      .then((mine) => {
        if (!stop)
          setProfile({
            display_name: mine.display_name,
            avatar_url: mine.avatar_url,
            onboarded: mine.onboarded,
          });
      })
      .catch(() => undefined);
    const timer = window.setInterval(tick, UNREAD_REFRESH_MS);
    return () => {
      stop = true;
      window.clearInterval(timer);
    };
  }, [active, slug]);

  const retry = React.useCallback(() => {
    branding.reload();
    void session.refresh();
  }, [branding, session]);

  const college = branding.status === "ready" ? branding.data : null;
  const value = React.useMemo<CollegeContextValue | null>(() => {
    if (!college || !entry || !active) return null;
    return {
      slug,
      college,
      membership: entry.membership,
      isModerator:
        entry.membership.role === "moderator" || entry.membership.role === "college_admin",
      unread,
      refreshUnread,
      profile,
      refreshProfile,
    };
  }, [college, entry, active, slug, unread, refreshUnread, profile, refreshProfile]);

  if (session.status === "loading" || branding.status === "loading") return { state: "loading" };
  if (session.status === "error") return { state: "error", error: session.error, retry };
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
  if (session.status === "signed-out") return { state: "signed-out" };
  if (!entry || entry.membership.status === "left") return { state: "needs-join" };
  if (!active) return { state: "needs-approval" };
  return { state: "ready", value: value! };
}

export { CollegeContext };
