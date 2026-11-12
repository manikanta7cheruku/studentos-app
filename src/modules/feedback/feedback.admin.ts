import { adminClient } from "@/server/admin/supabase-admin";
import { toIso } from "@/lib/api";
import { mapDbError } from "@/lib/db-error";

// Feedback from people (migration 20261122000000, functions feedback_create, owner_feedback, owner_feedback_set).

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await adminClient().rpc(fn, args);
  if (error) throw mapDbError(error);
  return data as T;
}

export async function createFeedback(
  user: string,
  college: string | null,
  input: { kind: string; message: string; page?: string },
) {
  const row = await rpc<{ id: string; created_at: string }>("feedback_create", {
    p_user: user,
    p_college: college,
    p_kind: input.kind,
    p_message: input.message,
    p_page: input.page ?? null,
  });
  return { id: row.id, created_at: toIso(row.created_at) as string };
}

export type FeedbackRow = {
  id: string;
  kind: "idea" | "problem" | "other";
  message: string;
  page: string | null;
  status: "new" | "seen" | "done";
  created_at: string;
  user_name: string;
  user_email: string | null;
  college_slug: string | null;
};

/** For the owner dashboard only. */
export const ownerFeedback = (status: string | null) =>
  rpc<FeedbackRow[] | null>("owner_feedback", { p_status: status, p_limit: 100 }).then(
    (rows) => rows ?? [],
  );

export const setFeedbackStatus = (id: string, status: "new" | "seen" | "done") =>
  rpc("owner_feedback_set", { p_id: id, p_status: status });
