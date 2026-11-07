import type { SupabaseClient } from "@supabase/supabase-js";
import { toIso } from "@/lib/api";
import { mapDbError } from "@/lib/db-error";
import { paginate, type PageCursor } from "@/lib/cursor";

// Reads that run with the signed-in person's OWN rights (Row Level Security decides what comes back).

type NotificationRow = {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
};

export async function listMyNotifications(
  supabase: SupabaseClient,
  input: { unread: boolean; limit: number; cursor: PageCursor | null },
) {
  const { data, error } = await supabase.rpc("notifications_list", {
    p_unread: input.unread,
    p_limit: input.limit + 1,
    p_after_created: input.cursor?.at ?? null,
    p_after_id: input.cursor?.id ?? null,
  });
  if (error) throw mapDbError(error);
  const { page, nextCursor } = paginate(
    (data ?? []) as NotificationRow[],
    input.limit,
    (row) => row.id,
  );
  const { count, error: countError } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .is("read_at", null);
  if (countError) throw mapDbError(countError);
  return {
    nextCursor,
    unreadCount: count ?? 0,
    items: page.map((row) => ({
      ...row,
      read_at: toIso(row.read_at),
      created_at: toIso(row.created_at),
    })),
  };
}

// Marks only the person's own notifications. Someone else's id changes nothing (RLS), so the count is honest.
export async function markNotificationsRead(
  supabase: SupabaseClient,
  input: { ids: string[] } | { all: true },
): Promise<number> {
  const now = new Date().toISOString();
  let query = supabase.from("notifications").update({ read_at: now }).is("read_at", null);
  if ("ids" in input) query = query.in("id", input.ids);
  const { data, error } = await query.select("id");
  if (error) throw mapDbError(error);
  return data?.length ?? 0;
}

type AnnouncementRow = {
  id: string;
  author_id: string | null;
  author_name: string;
  title: string;
  body: string;
  pinned: boolean;
  status: string;
  publish_at: string;
  expires_at: string | null;
  created_at: string;
};

export async function listAnnouncementsForMember(
  supabase: SupabaseClient,
  college: string,
  input: { limit: number; cursor: PageCursor | null },
) {
  const { data, error } = await supabase.rpc("announcements_list", {
    p_college: college,
    p_limit: input.limit + 1,
    p_after_pinned: input.cursor?.k === undefined ? null : Number(input.cursor.k),
    p_after_at: input.cursor?.at ?? null,
    p_after_id: input.cursor?.id ?? null,
  });
  if (error) throw mapDbError(error);
  const { page, nextCursor } = paginate(
    (data ?? []) as AnnouncementRow[],
    input.limit,
    (row) => row.id,
    {
      atOf: (row) => row.publish_at,
      kOf: (row) => (row.pinned ? "1" : "0"),
    },
  );
  return {
    nextCursor,
    items: page.map((row) => ({
      id: row.id,
      author: { user_id: row.author_id, display_name: row.author_name },
      title: row.title,
      body: row.body,
      pinned: row.pinned,
      status: row.status,
      publish_at: toIso(row.publish_at),
      expires_at: toIso(row.expires_at),
      created_at: toIso(row.created_at),
    })),
  };
}
