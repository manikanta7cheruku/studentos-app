import type { SupabaseClient, User } from "@supabase/supabase-js";
import { AppError } from "@/lib/errors";
import { CookieJar, getCurrentUser } from "@/lib/supabase/request-client";

export type MembershipRow = {
  membership_id: string;
  college_id: string;
  college_slug: string;
  college_status: string;
  role: "student" | "moderator" | "college_admin";
  status: "pending" | "active" | "suspended" | "rejected" | "left";
  verification_level: number;
  verification_method: string | null;
  program: string | null;
  grad_year: number | null;
  joined_at: string | null;
  status_reason: string | null;
};

export type Member = { user: User; supabase: SupabaseClient; membership: MembershipRow };

// The caller's own membership in a college, or null. Uses the user's login, so the database
// only ever returns the caller's own row.
export async function loadMembership(
  supabase: SupabaseClient,
  slug: string,
): Promise<MembershipRow | null> {
  const { data, error } = await supabase.rpc("my_membership_for_slug", { p_slug: slug });
  if (error) throw new AppError("UPSTREAM_UNAVAILABLE", { cause: error });
  const rows = (data ?? []) as MembershipRow[];
  return rows[0] ?? null;
}

type Requirement = {
  minLevel?: number;
  roles?: MembershipRow["role"][];
};

// Order from docs/API_CONTRACT.md section 1: signed in, then the college, then an active membership
// with a high enough level, then the role. Someone who is not a member gets NOT_FOUND, so the
// answer never shows whether a college exists.
export async function requireMember(
  request: Request,
  jar: CookieJar,
  slug: string,
  requirement: Requirement = {},
): Promise<Member> {
  const { user, supabase } = await getCurrentUser(request, jar);
  const membership = await loadMembership(supabase, slug);
  if (!membership) throw new AppError("NOT_FOUND");
  if (membership.college_status === "suspended" || membership.college_status === "archived") {
    throw new AppError("TENANT_SUSPENDED");
  }
  if (membership.status !== "active") throw new AppError("MEMBERSHIP_NOT_ACTIVE");
  if (membership.verification_level < (requirement.minLevel ?? 1)) {
    throw new AppError("VERIFICATION_LEVEL_TOO_LOW");
  }
  if (requirement.roles && !requirement.roles.includes(membership.role)) {
    throw new AppError("FORBIDDEN");
  }
  return { user, supabase, membership };
}
