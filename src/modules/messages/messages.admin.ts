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

type InboxRow = {
  other_id: string;
  other_name: string;
  other_avatar_path: string | null;
  unread: number;
  last_at: string;
  status: "accepted" | "pending" | "declined" | "expired";
  requester_id: string | null;
  request_expires_at: string | null;
  decided_at: string | null;
};

function kindOf(row: InboxRow, actor: string) {
  if (row.status === "pending")
    return row.requester_id === actor ? "request_sent" : "request_received";
  if (row.status === "declined") return "declined";
  if (row.status === "expired") return "expired";
  return "chat";
}

export async function listThreads(actor: string, college: string) {
  const rows = await rpc<InboxRow[] | null>("dm_inbox", { p_actor: actor, p_college: college });
  return (rows ?? []).map((row) => ({
    user_id: row.other_id,
    display_name: row.other_name,
    avatar_url: avatarUrl(row.other_avatar_path),
    unread: row.unread,
    last_at: toIso(row.last_at) as string,
    kind: kindOf(row, actor),
    expires_at: row.request_expires_at ? toIso(row.request_expires_at) : null,
    can_request_again_at:
      row.status === "declined" && row.decided_at
        ? new Date(new Date(row.decided_at).getTime() + 5 * 86_400_000).toISOString()
        : null,
  }));
}

export async function getThread(actor: string, college: string, other: string) {
  const data = await rpc<{
    other: {
      user_id: string;
      display_name: string;
      avatar_path: string | null;
      headline: string | null;
      college_name: string | null;
      branch: string | null;
      grad_year: number | null;
    } | null;
    can_message: boolean;
    request: {
      status: string;
      i_requested: boolean;
      expires_at: string | null;
      can_request_again_at: string | null;
    } | null;
    messages: Json[];
  }>("dm_thread", { p_actor: actor, p_college: college, p_with: other });
  return {
    other: data.other
      ? {
          user_id: data.other.user_id,
          display_name: data.other.display_name,
          avatar_url: avatarUrl(data.other.avatar_path),
          headline: data.other.headline,
          college_name: data.other.college_name,
          branch: data.other.branch,
          grad_year: data.other.grad_year,
        }
      : null,
    can_message: data.can_message,
    request: data.request
      ? {
          status: data.request.status,
          i_requested: data.request.i_requested,
          expires_at: data.request.expires_at ? toIso(data.request.expires_at) : null,
          can_request_again_at: data.request.can_request_again_at
            ? toIso(data.request.can_request_again_at)
            : null,
        }
      : null,
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
    request: Boolean(row.request),
  };
}

export async function declineRequest(actor: string, college: string, other: string) {
  await rpc("dm_decline", { p_actor: actor, p_college: college, p_with: other });
  return { status: "declined" as const };
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
