import { adminClient } from "@/server/admin/supabase-admin";
import { mapDbError } from "@/lib/db-error";

// Wrappers around the network SQL functions (migration 20261136000000). Only the server calls them, with the verified user.

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await adminClient().rpc(fn, args);
  if (error) throw mapDbError(error);
  return data as T;
}

export async function suggestPeople(actor: string, college: string, limit: number) {
  const rows = await rpc<
    | {
        user_id: string;
        display_name: string;
        headline: string | null;
        avatar_path: string | null;
        college_name: string | null;
        branch: string | null;
        grad_year: number | null;
        shared_interests: string[] | null;
        mutual: number;
      }[]
    | null
  >("network_suggest", { p_actor: actor, p_college: college, p_limit: limit });
  return (rows ?? []).map((row) => ({
    user_id: row.user_id,
    display_name: row.display_name,
    headline: row.headline,
    avatar_url: row.avatar_path
      ? row.avatar_path.startsWith("http")
        ? row.avatar_path
        : adminClient().storage.from("avatars").getPublicUrl(row.avatar_path).data.publicUrl
      : null,
    college_name: row.college_name,
    branch: row.branch,
    grad_year: row.grad_year,
    shared_interests: row.shared_interests ?? [],
    mutual: row.mutual,
  }));
}

export async function myNetwork(user: string) {
  return rpc<{ connections: number; requests_sent: number; requests_received: number }>(
    "network_stats",
    { p_user: user },
  );
}

export async function connectionList(actor: string, college: string) {
  const rows = await rpc<
    | {
        user_id: string;
        display_name: string;
        headline: string | null;
        avatar_path: string | null;
        college_name: string | null;
        branch: string | null;
        grad_year: number | null;
        place: string | null;
      }[]
    | null
  >("network_connection_list", { p_actor: actor, p_college: college });
  return (rows ?? []).map((row) => ({
    user_id: row.user_id,
    display_name: row.display_name,
    headline: row.headline,
    avatar_url: row.avatar_path
      ? row.avatar_path.startsWith("http")
        ? row.avatar_path
        : adminClient().storage.from("avatars").getPublicUrl(row.avatar_path).data.publicUrl
      : null,
    college_name: row.college_name,
    branch: row.branch,
    grad_year: row.grad_year,
    place: row.place,
  }));
}
