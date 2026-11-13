import { deleteAccount } from "@/modules/account/account.admin";
import { adminClient } from "@/server/admin/supabase-admin";
import { AppError } from "@/lib/errors";
import { hashKey } from "@/lib/hash";
import { assertNotBlocked, clear, record } from "@/modules/rate-limit/rate-limit.admin";
import { verifyPin } from "./owner-pin";

// Everything the owner dashboard reads and does. Every call comes from a server page or a server action that has already
// checked the signed-in account, the allow-list and the unlock (src/modules/owner/owner-access.ts). The database
// functions (migration 20261116000000, owner_*) are closed to browsers. Nothing here is a public API.

async function rpc<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await adminClient().rpc(fn, args);
  if (error) throw new AppError("UPSTREAM_UNAVAILABLE", { cause: error });
  return data as T;
}

// ---- Access ----------------------------------------------------------------------------------------------------------
export async function isPlatformAdmin(userId: string): Promise<boolean> {
  const { data, error } = await adminClient()
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new AppError("UPSTREAM_UNAVAILABLE", { cause: error });
  return data !== null;
}

async function pinHashOf(userId: string): Promise<string | null> {
  const { data, error } = await adminClient()
    .from("platform_admins")
    .select("pin_hash")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new AppError("UPSTREAM_UNAVAILABLE", { cause: error });
  return data?.pin_hash ?? null;
}

export async function ownerAudit(
  userId: string,
  action: string,
  metadata: Record<string, unknown> = {},
) {
  await rpc("write_audit_log", {
    p_college_id: null,
    p_actor_id: userId,
    p_actor_role: "platform_owner",
    p_action: action,
    p_target_type: null,
    p_target_id: null,
    p_metadata: metadata,
    p_request_id: null,
  });
}

/**
 * Checks the PIN. 5 wrong tries in 15 minutes, or 20 in a day, lock it (whatever PIN is typed). A right PIN clears the
 * short counter. Every result is written to the audit trail.
 */
export async function checkPin(userId: string, pin: string): Promise<"ok" | "wrong" | "locked"> {
  const key = hashKey("owner-pin", userId);
  try {
    await assertNotBlocked("owner_pin_fail", key, 5, 15 * 60);
    await assertNotBlocked("owner_pin_day", key, 20, 24 * 60 * 60);
  } catch (caught) {
    if (caught instanceof AppError && caught.code === "RATE_LIMITED") {
      await ownerAudit(userId, "owner.pin_locked");
      return "locked";
    }
    throw caught;
  }
  const stored = await pinHashOf(userId);
  const good = stored !== null && (await verifyPin(pin, stored));
  if (good) {
    await clear("owner_pin_fail", key);
    return "ok";
  }
  await record("owner_pin_fail", key);
  await record("owner_pin_day", key);
  await ownerAudit(userId, "owner.pin_wrong");
  return "wrong";
}

// ---- Reads -----------------------------------------------------------------------------------------------------------
export type Overview = {
  colleges_total: number;
  colleges_active: number;
  colleges_suspended: number;
  users_total: number;
  users_active_7d: number;
  signups_7d: number;
  signups_30d: number;
  memberships_active: number;
  memberships_pending: number;
  plans: number;
  ideas: number;
  events: number;
  listings: number;
  reports_open: number;
  codes_open: number;
};
export const overview = () => rpc<Overview>("owner_overview");

export type Insights = {
  users: number;
  onboarded: number;
  sex: {
    woman: number;
    man: number;
    non_binary: number;
    prefer_not_to_say: number;
    unanswered: number;
  };
  age: { under_18: number; from_18_to_22: number; from_23: number; not_shared: number };
  with_phone: number;
  phone_shared_with_hosts: number;
  top_interests: { name: string; n: number }[];
  top_tech: { name: string; n: number }[];
  feedback_new: number;
  messages_waiting: number;
  venues: number;
  bookings_pending: number;
  photos: number;
};
/** Counts only. The owner never sees one person's sex, birth year or number. */
export const insights = () => rpc<Insights>("owner_insights");

export type SignupDay = { day: string; n: number };
export const signups = (days = 30) => rpc<SignupDay[]>("owner_signups", { p_days: days });

export type CollegeRow = {
  id: string;
  slug: string;
  name: string;
  short_name: string | null;
  city: string | null;
  state: string | null;
  status: "draft" | "active" | "suspended" | "archived";
  created_at: string;
  members: number;
  pending: number;
  admins: { user_id: string; name: string; email: string }[];
  domains: string[];
};
export const colleges = () => rpc<CollegeRow[]>("owner_colleges");

export type CodeRow = {
  id: string;
  label: string;
  created_at: string;
  expires_at: string;
  used_at: string | null;
  used_by_email: string | null;
  college_slug: string | null;
  state: "active" | "used" | "expired";
};
export const codes = () => rpc<CodeRow[]>("owner_codes");

export type UserRow = {
  id: string;
  email: string;
  display_name: string;
  created_at: string;
  last_sign_in_at: string | null;
  banned_until: string | null;
  suspended: boolean;
  spaces: { slug: string; name: string; role: string; status: string }[];
};
export const users = (q: string) => rpc<UserRow[]>("owner_users", { p_q: q, p_limit: 50 });

export type OwnerContentRow = {
  kind: "plan" | "thought" | "event" | "listing";
  id: string;
  title: string;
  author: string;
  college_slug: string;
  status: string;
  created_at: string;
};
export const content = (q: string) =>
  rpc<OwnerContentRow[]>("owner_content", { p_q: q, p_limit: 50 });

/** Removes any plan, thought, event or board post. The author is told why. Written to the audit log as the owner. */
export const removeContent = (
  actor: string,
  kind: OwnerContentRow["kind"],
  id: string,
  reason: string,
  note: string | null,
) =>
  rpc("owner_content_remove", {
    p_actor: actor,
    p_kind: kind,
    p_id: id,
    p_reason: reason,
    p_note: note,
  });

export type ReportRow = {
  id: string;
  college_slug: string;
  college_name: string;
  target_type: string;
  reason: string;
  details: string | null;
  reporter_email: string | null;
  created_at: string;
};
export const reports = () => rpc<ReportRow[]>("owner_reports", { p_limit: 100 });

export type Health = {
  database_bytes: number;
  rate_limit_blocks_24h: { bucket: string; n: number }[];
  audit_24h: number;
  oldest_pending_membership: string | null;
  tables: Record<string, number>;
};
export async function health(): Promise<Health & { database_ms: number }> {
  const started = Date.now();
  const data = await rpc<Health>("owner_health");
  return { ...data, database_ms: Date.now() - started };
}

export type AuditRow = {
  id: number;
  created_at: string;
  actor_email: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  college_slug: string | null;
  metadata: Record<string, unknown>;
};
export const audit = () => rpc<AuditRow[]>("owner_audit", { p_limit: 150 });

// ---- Actions (each one is written to the audit trail by the database function) ------------------------------------------
export const setCollegeStatus = (actor: string, college: string, status: "active" | "suspended") =>
  rpc("owner_college_set_status", { p_actor: actor, p_college: college, p_status: status });

export const makeCode = (actor: string, label: string, days: number) =>
  rpc<string>("owner_code_make", { p_actor: actor, p_label: label, p_days: days });

export const revokeCode = (actor: string, code: string) =>
  rpc("owner_code_revoke", { p_actor: actor, p_code: code });

/** Stops an account from signing in (and ends its sessions), or lets it back. The owner and other owners cannot be stopped. */
export async function setUserSuspended(actor: string, target: string, suspended: boolean) {
  if (actor === target || (await isPlatformAdmin(target))) throw new AppError("FORBIDDEN");
  const { error } = await adminClient().auth.admin.updateUserById(target, {
    ban_duration: suspended ? "876000h" : "none",
  });
  if (error) throw new AppError("UPSTREAM_UNAVAILABLE", { cause: error });
  await rpc("owner_user_audit", {
    p_actor: actor,
    p_target: target,
    p_action: suspended ? "owner.user_suspended" : "owner.user_restored",
  });
}

export type OwnerUserFull = {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  suspended: boolean;
  platform_admin: boolean;
  spaces: { slug: string; name: string; role: string; status: string }[];
  profile: {
    display_name: string | null;
    handle: string | null;
    headline: string | null;
    bio: string | null;
    college_name: string | null;
    branch: string | null;
    grad_year: number | null;
    interests: string[];
    tech_interests: string[];
    excited_by: string | null;
    visibility: string | null;
  };
  private: {
    sex: string | null;
    sex_public: boolean;
    birth_year: number | null;
    age_public: boolean;
    phone: string | null;
    phone_visibility: string;
  };
  counts: {
    buzz: number;
    replies: number;
    plans: number;
    events: number;
    upvotes: number;
    debates: number;
    invited: number;
    followers: number;
  };
};

/** The whole record of each person, for the owner. The page that calls this writes the visit to the audit log. */
export const usersFull = (q: string) =>
  rpc<OwnerUserFull[]>("owner_users_full", { p_q: q, p_limit: 100 });

/**
 * Deletes accounts for good, one after the other (the same removal a person gets from "Delete my account"). The owner and other
 * owners are skipped. An account that cannot go (for example the only admin of a college) is reported, not forced.
 */
export async function deleteUsers(actor: string, ids: string[]) {
  const result = { deleted: 0, skipped: [] as { id: string; reason: string }[] };
  for (const id of ids) {
    if (id === actor || (await isPlatformAdmin(id))) {
      result.skipped.push({ id, reason: "owner accounts cannot be deleted here" });
      continue;
    }
    try {
      await rpc("owner_user_audit", {
        p_actor: actor,
        p_target: id,
        p_action: "owner.user_deleted",
      });
      await deleteAccount(id, crypto.randomUUID());
      result.deleted += 1;
    } catch (caught) {
      const conflict = caught instanceof AppError && caught.code === "CONFLICT";
      result.skipped.push({
        id,
        reason: conflict ? "the only admin of a college" : "could not be deleted",
      });
    }
  }
  return result;
}
