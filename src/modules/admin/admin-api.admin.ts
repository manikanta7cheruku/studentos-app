import { adminClient } from "@/server/admin/supabase-admin";
import { toIso } from "@/lib/api";
import { mapDbError } from "@/lib/db-error";
import { paginate, type PageCursor } from "@/lib/cursor";

// Wrappers around the admin_* SQL functions (supabase/migrations/..._admin_endpoints.sql).
// Every function checks again, inside the database, that the actor is an active admin of the college.
// The actor and the college come from the verified login and from requireMember, never from the request body.

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await adminClient().rpc(fn, args);
  if (error) throw mapDbError(error);
  return data as T;
}

const iso = (value: unknown) => toIso(value as string | null);

// ---- settings (ADM-03) ----------------------------------------------------
export const getSettings = (actor: string, college: string) =>
  rpc<Record<string, unknown>>("admin_get_settings", { p_actor: actor, p_college: college });

export const updateSettings = (actor: string, college: string, patch: object, requestId: string) =>
  rpc<Record<string, unknown>>("admin_update_settings", {
    p_actor: actor,
    p_college: college,
    p_patch: patch,
    p_request_id: requestId,
  });

// ---- stats (ADM-11) -------------------------------------------------------
export const getStats = (actor: string, college: string) =>
  rpc<Record<string, unknown>>("admin_stats", { p_actor: actor, p_college: college });

// ---- invites (ADM-05) -----------------------------------------------------
type InviteJson = Record<string, unknown> & {
  expires_at: string;
  revoked_at: string | null;
  created_at: string;
};

function inviteOut(invite: InviteJson) {
  return {
    ...invite,
    expires_at: iso(invite.expires_at),
    revoked_at: iso(invite.revoked_at),
    created_at: iso(invite.created_at),
  };
}

export async function createInvite(
  actor: string,
  college: string,
  input: {
    codeHash: string;
    label: string;
    maxUses: number;
    expiresAt: string;
    grantsStatus: string;
  },
  requestId: string,
) {
  const invite = await rpc<InviteJson>("admin_create_invite", {
    p_actor: actor,
    p_college: college,
    p_code_hash: input.codeHash,
    p_label: input.label,
    p_max_uses: input.maxUses,
    p_expires_at: input.expiresAt,
    p_grants_status: input.grantsStatus,
    p_request_id: requestId,
  });
  return inviteOut(invite);
}

export async function listInvites(actor: string, college: string) {
  const rows = await rpc<InviteJson[] | null>("admin_list_invites", {
    p_actor: actor,
    p_college: college,
    p_limit: 100,
  });
  return (rows ?? []).map(inviteOut);
}

export async function revokeInvite(
  actor: string,
  college: string,
  invite: string,
  requestId: string,
) {
  return inviteOut(
    await rpc<InviteJson>("admin_revoke_invite", {
      p_actor: actor,
      p_college: college,
      p_invite: invite,
      p_request_id: requestId,
    }),
  );
}

// ---- verification queue (ADM-06, ADM-07) ----------------------------------
type RequestRow = {
  id: string;
  membership_id: string;
  method: string;
  status: string;
  user_id: string;
  display_name: string;
  email: string;
  program: string | null;
  grad_year: number | null;
  enrollment_last4: string | null;
  created_at: string;
  expires_at: string | null;
  decided_by: string | null;
  decided_at: string | null;
  decision_reason: string | null;
};

export async function listVerificationRequests(
  actor: string,
  college: string,
  input: { status?: string; limit: number; cursor: PageCursor | null },
) {
  const rows =
    (await rpc<RequestRow[] | null>("admin_list_verification_requests", {
      p_actor: actor,
      p_college: college,
      p_status: input.status ?? null,
      p_limit: input.limit + 1,
      p_after_created: input.cursor?.at ?? null,
      p_after_id: input.cursor?.id ?? null,
    })) ?? [];
  const { page, nextCursor } = paginate(rows, input.limit, (row) => row.id);
  return {
    nextCursor,
    items: page.map((row) => ({
      id: row.id,
      membership_id: row.membership_id,
      method: row.method,
      status: row.status,
      applicant: { user_id: row.user_id, display_name: row.display_name, email: row.email },
      submitted: {
        program: row.program,
        grad_year: row.grad_year,
        enrollment_last4: row.enrollment_last4,
      },
      created_at: iso(row.created_at),
      expires_at: iso(row.expires_at),
      decided_by: row.decided_by,
      decided_at: iso(row.decided_at),
      decision_reason: row.decision_reason,
    })),
  };
}

export async function decideVerification(
  actor: string,
  college: string,
  request: string,
  input: { decision: "approved" | "rejected"; reason?: string },
  requestId: string,
) {
  const result = await rpc<{
    request: { id: string; status: string; decided_by: string; decided_at: string };
    membership: Record<string, unknown>;
  }>("admin_decide_verification", {
    p_actor: actor,
    p_college: college,
    p_request: request,
    p_decision: input.decision,
    p_reason: input.reason ?? null,
    p_request_id: requestId,
  });
  return { ...result, request: { ...result.request, decided_at: iso(result.request.decided_at) } };
}

// ---- members (ADM-08, ADM-09) ---------------------------------------------
type MemberJson = Record<string, unknown> & { joined_at: string | null };
const memberOut = (member: MemberJson) => ({ ...member, joined_at: iso(member.joined_at) });

export async function listMembers(
  actor: string,
  college: string,
  input: { q?: string; status?: string; role?: string; limit: number; cursor: PageCursor | null },
) {
  const rows =
    (await rpc<{ member: MemberJson; created_at: string; id: string }[] | null>(
      "admin_list_members",
      {
        p_actor: actor,
        p_college: college,
        p_q: input.q ?? null,
        p_status: input.status ?? null,
        p_role: input.role ?? null,
        p_limit: input.limit + 1,
        p_after_created: input.cursor?.at ?? null,
        p_after_id: input.cursor?.id ?? null,
      },
    )) ?? [];
  const { page, nextCursor } = paginate(rows, input.limit, (row) => row.id);
  return { nextCursor, items: page.map((row) => memberOut(row.member)) };
}

export async function updateMember(
  actor: string,
  college: string,
  membership: string,
  input: { role?: string; status?: string; reason?: string },
  requestId: string,
) {
  const member = await rpc<MemberJson>("admin_update_member", {
    p_actor: actor,
    p_college: college,
    p_membership: membership,
    p_role: input.role ?? null,
    p_status: input.status ?? null,
    p_reason: input.reason ?? null,
    p_request_id: requestId,
  });
  return memberOut(member);
}

// ---- audit log (ADM-10) ---------------------------------------------------
type AuditRow = {
  id: number | string;
  actor_id: string | null;
  actor_name: string | null;
  actor_role: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  metadata: Record<string, unknown>;
  request_id: string | null;
  created_at: string;
};

export async function listAuditLogs(
  actor: string,
  college: string,
  input: { action?: string; actorId?: string; limit: number; cursor: PageCursor | null },
) {
  const rows =
    (await rpc<AuditRow[] | null>("admin_list_audit_logs", {
      p_actor: actor,
      p_college: college,
      p_action: input.action ?? null,
      p_actor_filter: input.actorId ?? null,
      p_limit: input.limit + 1,
      p_after_created: input.cursor?.at ?? null,
      p_after_id: input.cursor?.id ?? null,
    })) ?? [];
  // The id is a 64 bit number: the API sends it as a string.
  const { page, nextCursor } = paginate(rows, input.limit, (row) => String(row.id));
  return {
    nextCursor,
    items: page.map((row) => ({ ...row, id: String(row.id), created_at: iso(row.created_at) })),
  };
}
