"use client";

import * as React from "react";
import { api } from "@/lib/api/endpoints";
import { GLOBAL_SLUG } from "@/lib/home-path";
import { useLoad } from "@/lib/use-load";
import { useSession } from "@/features/session/session-provider";
import { useCollege } from "./college-provider";

/**
 * The public space (Global) is open to everyone. What is posted there is shown in every college feed too, with a Public
 * tag. This is true while I look at a college (not Global itself) and I am in the public space.
 */
export function usePublicEnabled(): boolean {
  const { slug } = useCollege();
  const session = useSession();
  return (
    slug !== GLOBAL_SLUG &&
    session.colleges.some(
      (item) => item.college.slug === GLOBAL_SLUG && item.membership.status === "active",
    )
  );
}

/**
 * Loads something from the public space for a college screen. It answers null when it is switched off, while loading, and when
 * the public space could not be reached, so a public list never takes the college's own list down with it.
 */
export function usePublicLoad<T>(load: () => Promise<T>, deps: React.DependencyList): T | null {
  const enabled = usePublicEnabled();
  const state = useLoad(
    () => (enabled ? load().catch(() => null) : Promise.resolve(null)),
    [...deps, enabled],
  );
  return state.status === "ready" ? (state.data as T | null) : null;
}

const TRIED = new Set<string>();

/**
 * Everyone belongs to the public space, so a student of a college can post there and sees what it holds. When a signed in
 * person has a college but no seat in the public space yet, they are added once, silently (it is open to all).
 */
export function useEnsurePublicSpace(): void {
  const session = useSession();
  const { refresh } = session;
  const hasCollege = session.colleges.some(
    (item) => item.college.slug !== GLOBAL_SLUG && item.membership.status === "active",
  );
  const hasPublic = session.colleges.some((item) => item.college.slug === GLOBAL_SLUG);
  React.useEffect(() => {
    if (session.status !== "signed-in" || !hasCollege || hasPublic) return;
    if (TRIED.has("global")) return;
    TRIED.add("global");
    api.colleges
      .joinOpen(GLOBAL_SLUG)
      .then(() => refresh())
      .catch(() => {
        // Not added (offline, or the space is closed). It is tried again on the next visit, nothing is shown.
        TRIED.delete("global");
      });
  }, [session.status, hasCollege, hasPublic, refresh]);
}
