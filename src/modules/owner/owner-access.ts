import { cookies, headers } from "next/headers";
import type { User } from "@supabase/supabase-js";
import { CookieJar, getCurrentUser } from "@/lib/supabase/request-client";
import { isPlatformAdmin } from "./owner.admin";
import { UNLOCK_COOKIE, isUnlocked } from "./owner-session";

// Who is looking at the owner dashboard, and how far in are they?
//   signed-out: not signed in            -> go to sign in
//   not-owner:  signed in, not allowed   -> the page does not exist ("not found")
//   locked:     allowed, no PIN yet      -> ask for the PIN
//   open:       allowed and unlocked     -> show the dashboard
// Server pages and server actions both call this. A server action can be called by anyone with a POST, so it must
// never trust that the page was shown first.

export type OwnerState =
  | { state: "signed-out" }
  | { state: "not-owner" }
  | { state: "locked"; user: User }
  | { state: "open"; user: User };

async function currentUser(): Promise<User | null> {
  const list = await headers();
  const request = new Request("http://localhost/", {
    headers: { cookie: list.get("cookie") ?? "" },
  });
  try {
    const { user } = await getCurrentUser(request, new CookieJar());
    return user;
  } catch {
    return null;
  }
}

export async function ownerState(): Promise<OwnerState> {
  const user = await currentUser();
  if (!user) return { state: "signed-out" };
  if (!(await isPlatformAdmin(user.id))) return { state: "not-owner" };
  const jar = await cookies();
  return isUnlocked(jar.get(UNLOCK_COOKIE)?.value, user.id)
    ? { state: "open", user }
    : { state: "locked", user };
}

/** For server actions: the owner who is unlocked, or an error. */
export async function requireOpenOwner(): Promise<User> {
  const state = await ownerState();
  if (state.state !== "open") throw new Error("Not allowed");
  return state.user;
}

/** For the PIN form: the allowed owner, whether or not they are unlocked yet. */
export async function requireOwner(): Promise<User> {
  const state = await ownerState();
  if (state.state !== "open" && state.state !== "locked") throw new Error("Not allowed");
  return state.user;
}
