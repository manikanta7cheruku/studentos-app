import { adminClient } from "@/server/admin/supabase-admin";
import { toIso } from "@/lib/api";
import { mapDbError } from "@/lib/db-error";
import { paginate, type PageCursor } from "@/lib/cursor";

// Wrappers around the opportunity SQL functions (migration 20261109000000).
// Every function checks again, inside the database, that the actor is an active member (or a moderator for
// the curate calls) of the college, and that the college has the Career tab on (otherwise FEATURE_DISABLED).

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await adminClient().rpc(fn, args);
  if (error) throw mapDbError(error);
  return data as T;
}

type OppJson = Record<string, unknown> & {
  deadline: string | null;
  last_verified_at: string;
  created_at: string;
};
const oppOut = (o: OppJson) => ({
  ...o,
  deadline: toIso(o.deadline),
  last_verified_at: toIso(o.last_verified_at),
  created_at: toIso(o.created_at),
});

type ListRow = { id: string; created_at: string; item: OppJson };
function pageOf(rows: ListRow[] | null, limit: number) {
  const { page, nextCursor } = paginate(rows ?? [], limit, (row) => row.id);
  return { nextCursor, items: page.map((row) => oppOut(row.item)) };
}

export async function listOpportunities(
  actor: string,
  college: string,
  input: {
    kinds?: string[];
    skills?: string[];
    mode?: string;
    location?: string;
    deadline?: string;
    q?: string;
    saved: boolean;
    limit: number;
    cursor: PageCursor | null;
  },
) {
  const rows = await rpc<ListRow[] | null>("opp_list", {
    p_actor: actor,
    p_college: college,
    p_kinds: input.kinds ?? null,
    p_skills: input.skills ?? null,
    p_mode: input.mode ?? null,
    p_location: input.location ?? null,
    p_deadline: input.deadline ?? null,
    p_q: input.q ?? null,
    p_saved: input.saved,
    p_limit: input.limit + 1,
    p_after_created: input.cursor?.at ?? null,
    p_after_id: input.cursor?.id ?? null,
  });
  return pageOf(rows, input.limit);
}

export async function getOpportunity(actor: string, college: string, id: string) {
  return oppOut(await rpc<OppJson>("opp_get", { p_actor: actor, p_college: college, p_opp: id }));
}

export async function setSavedOpportunity(actor: string, id: string, saved: boolean) {
  return rpc<{ saved: boolean; opportunity_id: string }>("opp_set_saved", {
    p_actor: actor,
    p_opp: id,
    p_saved: saved,
  });
}

export async function createOpportunity(
  actor: string,
  college: string,
  data: object,
  requestId: string,
) {
  return oppOut(
    await rpc<OppJson>("mod_create_opportunity", {
      p_actor: actor,
      p_college: college,
      p_data: data,
      p_request_id: requestId,
    }),
  );
}

export async function updateOpportunity(
  actor: string,
  college: string,
  id: string,
  patch: object,
  requestId: string,
) {
  return oppOut(
    await rpc<OppJson>("mod_update_opportunity", {
      p_actor: actor,
      p_college: college,
      p_opp: id,
      p_patch: patch,
      p_request_id: requestId,
    }),
  );
}

export async function removeOpportunity(
  actor: string,
  college: string,
  id: string,
  requestId: string,
) {
  return rpc<{ id: string; status: string }>("mod_remove_opportunity", {
    p_actor: actor,
    p_college: college,
    p_opp: id,
    p_request_id: requestId,
  });
}

export async function listOpportunitiesForModerators(
  actor: string,
  college: string,
  input: { status?: string; limit: number; cursor: PageCursor | null },
) {
  const rows = await rpc<ListRow[] | null>("mod_list_opportunities", {
    p_actor: actor,
    p_college: college,
    p_status: input.status ?? null,
    p_limit: input.limit + 1,
    p_after_created: input.cursor?.at ?? null,
    p_after_id: input.cursor?.id ?? null,
  });
  return pageOf(rows, input.limit);
}

export async function getReminderSettings(actor: string): Promise<boolean> {
  return rpc<boolean>("rem_get", { p_actor: actor });
}

export async function setReminderSettings(actor: string, enabled: boolean): Promise<boolean> {
  return rpc<boolean>("rem_set", { p_actor: actor, p_enabled: enabled });
}
