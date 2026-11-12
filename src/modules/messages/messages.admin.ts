import { adminClient } from "@/server/admin/supabase-admin";
import { toIso } from "@/lib/api";
import { mapDbError } from "@/lib/db-error";

// Wrappers around the disappearing message functions (migration 20261123000000, functions dm_*). Every function checks again,
// inside the database, that both people are active members of the college and that neither blocked the other.
// The actor and the college come from the verified login and from requireMember, never from the request body.

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await adminClient().rpc(fn, args);
  if (error) throw mapDbError(error);
  return data as T;
}

type Json = Record<string, unknown>;

function avatarUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return adminClient().storage.from("avatars").getPublicUrl(path).data.publicUrl ?? null;
}

export async function listThreads(actor: string, college: string) {
  const rows = await rpc<
    | {
        other_id: string;
        other_name: string;
        other_avatar_path: string | null;
        unread: number;
        last_at: string;
      }[]
    | null
  >("dm_inbox", { p_actor: actor, p_college: college });
  return (rows ?? []).map((row) => ({
    user_id: row.other_id,
    display_name: row.other_name,
    avatar_url: avatarUrl(row.other_avatar_path),
    unread: row.unread,
    last_at: toIso(row.last_at) as string,
  }));
}

export async function getThread(actor: string, college: string, other: string) {
  const data = await rpc<{
    other: { user_id: string; display_name: string; avatar_path: string | null } | null;
    can_message: boolean;
    messages: Json[];
  }>("dm_thread", { p_actor: actor, p_college: college, p_with: other });
  return {
    other: data.other
      ? {
          user_id: data.other.user_id,
          display_name: data.other.display_name,
          avatar_url: avatarUrl(data.other.avatar_path),
        }
      : null,
    can_message: data.can_message,
    messages: data.messages.map((m) => ({
      ...m,
      created_at: toIso(m.created_at as string),
      opened_at: m.opened_at ? toIso(m.opened_at as string) : null,
      expires_at: toIso(m.expires_at as string),
    })),
  };
}

export async function sendMessage(actor: string, college: string, to: string, body: string) {
  const row = await rpc<Json>("dm_send", {
    p_actor: actor,
    p_college: college,
    p_to: to,
    p_body: body,
  });
  return {
    id: row.id,
    created_at: toIso(row.created_at as string),
    expires_at: toIso(row.expires_at as string),
  };
}

export async function reportThread(
  actor: string,
  college: string,
  other: string,
  input: { reason: string; details?: string },
) {
  const row = await rpc<Json>("dm_report", {
    p_actor: actor,
    p_college: college,
    p_with: other,
    p_reason: input.reason,
    p_details: input.details ?? null,
  });
  return { ...row, created_at: toIso(row.created_at as string) };
}
