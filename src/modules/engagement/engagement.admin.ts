import { adminClient } from "@/server/admin/supabase-admin";
import { toIso } from "@/lib/api";
import { mapDbError } from "@/lib/db-error";
import { paginate, type PageCursor } from "@/lib/cursor";

// Wrappers around the moderator, report, block and waitlist SQL functions (migration 0005).
// Every moderator function checks again, inside the database, that the actor is an active moderator or admin.
// The actor and the college come from the verified login and from requireMember, never from the request body.

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await adminClient().rpc(fn, args);
  if (error) throw mapDbError(error);
  return data as T;
}

const iso = (value: unknown) => toIso(value as string | null);

// ---- announcements (ANN-02) ------------------------------------------------
type AnnouncementJson = Record<string, unknown> & {
  publish_at: string;
  expires_at: string | null;
  created_at: string;
};

const announcementOut = (a: AnnouncementJson) => ({
  ...a,
  publish_at: iso(a.publish_at),
  expires_at: iso(a.expires_at),
  created_at: iso(a.created_at),
});

export async function createAnnouncement(
  actor: string,
  college: string,
  input: {
    title: string;
    body: string;
    pinned: boolean;
    publish_at?: string;
    expires_at?: string | null;
  },
  requestId: string,
) {
  return announcementOut(
    await rpc<AnnouncementJson>("mod_create_announcement", {
      p_actor: actor,
      p_college: college,
      p_title: input.title,
      p_body: input.body,
      p_pinned: input.pinned,
      p_publish_at: input.publish_at ?? null,
      p_expires_at: input.expires_at ?? null,
      p_request_id: requestId,
    }),
  );
}

export async function updateAnnouncement(
  actor: string,
  college: string,
  announcementId: string,
  patch: object,
  requestId: string,
) {
  return announcementOut(
    await rpc<AnnouncementJson>("mod_update_announcement", {
      p_actor: actor,
      p_college: college,
      p_announcement: announcementId,
      p_patch: patch,
      p_request_id: requestId,
    }),
  );
}

export async function listAnnouncementsForModerators(
  actor: string,
  college: string,
  input: { limit: number; cursor: PageCursor | null },
) {
  const rows =
    (await rpc<{ item: AnnouncementJson; created_at: string; id: string }[] | null>(
      "mod_list_announcements",
      {
        p_actor: actor,
        p_college: college,
        p_limit: input.limit + 1,
        p_after_created: input.cursor?.at ?? null,
        p_after_id: input.cursor?.id ?? null,
      },
    )) ?? [];
  const { page, nextCursor } = paginate(rows, input.limit, (row) => row.id);
  return { nextCursor, items: page.map((row) => announcementOut(row.item)) };
}

// ---- reports (RPT-01 to RPT-03) -------------------------------------------
export async function createReport(
  actor: string,
  college: string,
  input: { target_type: string; target_id: string; reason: string; details?: string },
) {
  const result = await rpc<{ id: string; status: string; created_at: string }>("create_report", {
    p_actor: actor,
    p_college: college,
    p_target_type: input.target_type,
    p_target: input.target_id,
    p_reason: input.reason,
    p_details: input.details ?? null,
  });
  return { ...result, created_at: iso(result.created_at) };
}

type ReportRow = {
  id: string;
  target_type: string;
  target_id: string;
  target_title: string | null;
  reason: string;
  details: string | null;
  status: string;
  reporter_id: string | null;
  reporter_name: string;
  handled_by: string | null;
  handled_at: string | null;
  created_at: string;
};

export async function listReports(
  actor: string,
  college: string,
  input: { status?: string; limit: number; cursor: PageCursor | null },
) {
  const rows =
    (await rpc<ReportRow[] | null>("mod_list_reports", {
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
      target_type: row.target_type,
      target_id: row.target_id,
      target_title: row.target_title,
      reason: row.reason,
      details: row.details,
      status: row.status,
      reporter: { user_id: row.reporter_id, display_name: row.reporter_name },
      handled_by: row.handled_by,
      handled_at: iso(row.handled_at),
      created_at: iso(row.created_at),
    })),
  };
}

export async function actOnReport(
  actor: string,
  college: string,
  report: string,
  input: { action: string; note?: string },
  requestId: string,
) {
  const result = await rpc<{
    report: { id: string; status: string; handled_by: string; handled_at: string };
  }>("mod_act_on_report", {
    p_actor: actor,
    p_college: college,
    p_report: report,
    p_action: input.action,
    p_note: input.note ?? null,
    p_request_id: requestId,
  });
  return { report: { ...result.report, handled_at: iso(result.report.handled_at) } };
}

// ---- blocks (RPT-04) ------------------------------------------------------
export async function blockUser(actor: string, target: string): Promise<void> {
  await rpc<null>("block_user", { p_actor: actor, p_target: target });
}

export async function listBlocks(actor: string) {
  const rows = await rpc<
    | { user_id: string; display_name: string; avatar_path: string | null; blocked_at: string }[]
    | null
  >("blocks_list", { p_user: actor });
  return (rows ?? []).map((row) => ({
    user_id: row.user_id,
    display_name: row.display_name,
    avatar_url: avatarUrlFor(row.avatar_path),
    blocked_at: toIso(row.blocked_at) as string,
  }));
}

function avatarUrlFor(path: string | null): string | null {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return base ? `${base.replace(/\/$/, "")}/storage/v1/object/public/avatars/${path}` : null;
}

export async function unblockUser(actor: string, target: string): Promise<void> {
  await rpc<null>("unblock_user", { p_actor: actor, p_target: target });
}

// ---- waitlist (WL-01) -----------------------------------------------------
export async function joinWaitlist(input: {
  college_name: string;
  contact_name: string;
  contact_email: string;
  role: string;
  source?: string;
}): Promise<boolean> {
  return rpc<boolean>("join_waitlist", {
    p_college_name: input.college_name,
    p_contact_name: input.contact_name,
    p_contact_email: input.contact_email,
    p_role: input.role,
    p_source: input.source ?? null,
  });
}
