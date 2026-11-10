import { adminClient } from "@/server/admin/supabase-admin";
import { toIso } from "@/lib/api";
import { AppError } from "@/lib/errors";
import { mapDbError } from "@/lib/db-error";

// Wrappers around the application tracker SQL (migration 20261113000000). Private to the person: every call carries
// the signed in user id, and the database functions and queries check it again. Never shared, not with admins.

type AppRow = Record<string, unknown> & { created_at: string; updated_at: string };
type AppDetail = AppRow & { events?: ({ at: string } & Record<string, unknown>)[] };

// The database writes times as 2026-11-10T09:30:00+00:00. The API always answers in the form ending in Z.
function out<T extends AppDetail>(app: T): T {
  return {
    ...app,
    created_at: toIso(app.created_at),
    updated_at: toIso(app.updated_at),
    ...(app.events ? { events: app.events.map((e) => ({ ...e, at: toIso(e.at) })) } : {}),
  };
}

async function rpc(fn: string, args: Record<string, unknown>): Promise<AppDetail> {
  const { data, error } = await adminClient().rpc(fn, args);
  if (error) throw mapDbError(error);
  return out(data as AppDetail);
}

// The version a client sends in If-Match: a whole number (also in quotes), or nothing.
export function parseIfMatch(header: string | null): number | null {
  if (header === null || header.trim() === "") return null;
  const match = /^"?(\d{1,9})"?$/.exec(header.trim());
  if (!match) {
    throw new AppError("VALIDATION_FAILED", {
      details: { fields: [{ path: "If-Match", message: "Send the version number you last saw." }] },
    });
  }
  return Number(match[1]);
}

export async function createApplication(userId: string, input: Record<string, unknown>) {
  return rpc("app_create", { p_actor: userId, p_input: input });
}

export async function getApplication(userId: string, id: string) {
  const { data, error } = await adminClient().rpc("app_json", { p_app: id, p_actor: userId });
  if (error) throw mapDbError(error);
  if (!data) throw new AppError("NOT_FOUND");
  return out(data as AppDetail);
}

export async function updateApplication(
  userId: string,
  id: string,
  patch: Record<string, unknown>,
  version: number | null,
) {
  return rpc("app_update", {
    p_actor: userId,
    p_id: id,
    p_patch: patch,
    p_version: version,
  });
}

export async function changeApplicationStatus(
  userId: string,
  id: string,
  status: string,
  note: string | undefined,
  version: number | null,
) {
  return rpc("app_change_status", {
    p_actor: userId,
    p_id: id,
    p_to: status,
    p_note: note ?? "",
    p_version: version,
  });
}

export async function deleteApplication(userId: string, id: string): Promise<{ deleted: true }> {
  const { data, error } = await adminClient()
    .from("job_applications")
    .delete()
    .eq("id", id)
    .eq("user_id", userId)
    .select("id");
  if (error) throw mapDbError(error);
  if (!data || data.length === 0) throw new AppError("NOT_FOUND");
  return { deleted: true };
}

const COLUMNS =
  "id, company, role_title, source_url, status, deadline, applied_on, notes, opportunity_id, version, created_at, updated_at";

export async function listApplications(
  userId: string,
  input: { status?: string; sort: "updated" | "deadline"; q?: string },
) {
  let query = adminClient().from("job_applications").select(COLUMNS).eq("user_id", userId);
  if (input.status) query = query.eq("status", input.status);
  if (input.q) {
    // Remove the characters that mean something in a filter or a LIKE pattern, so a search cannot change the query.
    const term = input.q.replace(/[\\%_,()*]/g, " ").trim();
    if (term) query = query.or(`company.ilike.%${term}%,role_title.ilike.%${term}%`);
  }
  query =
    input.sort === "deadline"
      ? query.order("deadline", { ascending: true, nullsFirst: false }).order("id")
      : query.order("updated_at", { ascending: false }).order("id", { ascending: false });
  const { data, error } = await query.limit(200);
  if (error) throw mapDbError(error);
  return ((data ?? []) as AppRow[]).map((row) => out(row));
}
