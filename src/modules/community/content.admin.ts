import { adminClient } from "@/server/admin/supabase-admin";
import { toIso } from "@/lib/api";
import { mapDbError } from "@/lib/db-error";

// Removing content with a reason, for a moderator or admin of a college (migration 20261117000000, content_remove and
// content_recent). The database function checks the role again, writes the audit trail and tells the author why.

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await adminClient().rpc(fn, args);
  if (error) throw mapDbError(error);
  return data as T;
}

export async function removeContent(
  actor: string,
  college: string,
  input: { kind: string; id: string; reason: string; note?: string },
) {
  await rpc("content_remove", {
    p_actor: actor,
    p_college: college,
    p_kind: input.kind,
    p_id: input.id,
    p_reason: input.reason,
    p_note: input.note ?? null,
  });
  return { removed: true as const };
}

export async function recentContent(actor: string, college: string, limit: number) {
  const rows = await rpc<({ created_at: string } & Record<string, unknown>)[] | null>(
    "content_recent",
    {
      p_actor: actor,
      p_college: college,
      p_limit: limit,
    },
  );
  return (rows ?? []).map((row) => ({ ...row, created_at: toIso(row.created_at) }));
}
