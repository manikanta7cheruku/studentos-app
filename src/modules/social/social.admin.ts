import { adminClient } from "@/server/admin/supabase-admin";
import { toIso } from "@/lib/api";
import { mapDbError } from "@/lib/db-error";

// Wrappers around the SQL functions for following, invite links and contributions
// (migrations 20261129000000, 20261133000000 and 20261134000000). Only the server calls them, always with the verified user.

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
  debates: number;
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

export async function listConnections(userId: string, kind: "followers" | "following") {
  const rows = await rpc<
    | {
        user_id: string;
        display_name: string;
        headline: string | null;
        avatar_path: string | null;
        since: string;
      }[]
    | null
  >("follow_list", { p_user: userId, p_kind: kind, p_limit: 200 });
  return (rows ?? []).map((row) => ({
    user_id: row.user_id,
    display_name: row.display_name,
    headline: row.headline,
    avatar_url: row.avatar_path
      ? row.avatar_path.startsWith("http")
        ? row.avatar_path
        : adminClient().storage.from("avatars").getPublicUrl(row.avatar_path).data.publicUrl
      : null,
    since: toIso(row.since) as string,
  }));
}

export async function suggestColleges(q: string): Promise<string[]> {
  const data = await rpc<string[] | null>("college_name_suggest", { p_q: q });
  return data ?? [];
}
