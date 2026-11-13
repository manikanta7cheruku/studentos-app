import { adminClient } from "@/server/admin/supabase-admin";
import { toIso } from "@/lib/api";
import { mapDbError } from "@/lib/db-error";
import { challengeFor, weekEndsAt, weekKey } from "@/lib/challenges";

// Wrappers around the SQL functions for following, invite links, weekly challenges and contributions
// (migrations 20261129000000 and 20261131000000). Only the server calls them, always with the verified user.

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await adminClient().rpc(fn, args);
  if (error) throw mapDbError(error);
  return data as T;
}

export type Contributions = {
  buzz: number;
  replies: number;
  plans: number;
  events: number;
  upvotes: number;
  challenges: number;
  invited: number;
};
export type FollowInfo = { followers: number; following: number; i_follow: boolean };

/** A failed lookup here must not break a profile: the numbers are a nicety. */
export async function getContributions(userId: string): Promise<Contributions | null> {
  const { data, error } = await adminClient().rpc("profile_contributions", { p_user: userId });
  return error ? null : (data as Contributions);
}

export async function getFollowInfo(target: string, actor: string): Promise<FollowInfo> {
  const { data, error } = await adminClient().rpc("follow_info", {
    p_target: target,
    p_actor: actor,
  });
  return error ? { followers: 0, following: 0, i_follow: false } : (data as FollowInfo);
}

export async function setFollow(actor: string, target: string, on: boolean) {
  return rpc<FollowInfo>("follow_set", { p_actor: actor, p_target: target, p_on: on });
}

export async function getInvite(user: string) {
  return rpc<{ code: string; invited: number }>("invite_info", { p_user: user });
}

export async function applyReferral(user: string, code: string) {
  const applied = await rpc<boolean>("referral_apply", { p_user: user, p_code: code });
  return { applied: Boolean(applied) };
}

/** The college, branch and year a person wrote on their own profile (other people read them through the profile). */
export async function getStudyDetails(userId: string) {
  const { data } = await adminClient()
    .from("profiles")
    .select("college_name, branch, grad_year")
    .eq("user_id", userId)
    .maybeSingle();
  return {
    college_name: (data?.college_name as string | null) ?? null,
    branch: (data?.branch as string | null) ?? null,
    grad_year: (data?.grad_year as number | null) ?? null,
  };
}

type EntryRow = {
  id: string;
  body: string;
  created_at: string;
  is_mine: boolean;
  applause: number;
  i_applauded: boolean;
  author: { user_id: string; display_name: string; avatar_path: string | null };
};

function entryOut(row: EntryRow) {
  const { avatar_path, ...author } = row.author;
  const avatar_url = avatar_path
    ? avatar_path.startsWith("http")
      ? avatar_path
      : adminClient().storage.from("avatars").getPublicUrl(avatar_path).data.publicUrl
    : null;
  return { ...row, created_at: toIso(row.created_at) as string, author: { ...author, avatar_url } };
}

export async function currentChallenge(actor: string) {
  const key = weekKey();
  const [rows, done] = await Promise.all([
    rpc<EntryRow[] | null>("challenge_list", { p_actor: actor, p_week: key, p_limit: 30 }),
    adminClient()
      .from("challenge_entries")
      .select("id", { count: "exact", head: true })
      .eq("user_id", actor),
  ]);
  const entries = (rows ?? []).map(entryOut);
  let mine = entries.find((entry) => entry.is_mine) ?? null;
  if (!mine) {
    // My answer may be beyond the first 30: look it up on its own.
    const own = await adminClient()
      .from("challenge_entries")
      .select("id")
      .eq("user_id", actor)
      .eq("week_key", key)
      .maybeSingle();
    if (own.data?.id) {
      const row = await rpc<EntryRow | null>("challenge_entry_json", {
        p_entry: own.data.id,
        p_actor: actor,
      });
      mine = row ? entryOut(row) : null;
    }
  }
  return {
    week_key: key,
    ...challengeFor(key),
    ends_at: weekEndsAt(),
    entries,
    my_entry: mine,
    completed: done.count ?? 0,
  };
}

export async function submitChallenge(actor: string, body: string) {
  const row = await rpc<EntryRow>("challenge_submit", {
    p_user: actor,
    p_week: weekKey(),
    p_body: body,
  });
  return entryOut(row);
}

export async function applaudEntry(actor: string, entry: string, on: boolean) {
  const row = await rpc<EntryRow>("challenge_applaud", {
    p_actor: actor,
    p_entry: entry,
    p_on: on,
  });
  return entryOut(row);
}
