import { adminClient } from "@/server/admin/supabase-admin";
import { AppError } from "@/lib/errors";
import { hashKey } from "@/lib/hash";
import { mapDbError } from "@/lib/db-error";

// Wrappers around the join SQL functions (supabase/migrations/..._join_invites_manual_domain.sql).
// The caller has already proven who the user is. These functions run with the service role.

export type MembershipSummary = {
  id: string;
  status: "pending" | "active" | "suspended" | "rejected" | "left";
  verification_level: number;
  verification_method: string | null;
};

type JoinRow = {
  membership_id: string;
  status: MembershipSummary["status"];
  verification_level: number;
  verification_method: string;
};

function toSummary(rows: JoinRow[] | null): MembershipSummary {
  const row = rows?.[0];
  if (!row) throw new AppError("INTERNAL", { cause: "join function returned no row" });
  return {
    id: row.membership_id,
    status: row.status,
    verification_level: row.verification_level,
    verification_method: row.verification_method,
  };
}

// Invite codes are stored as an HMAC hash. The admin endpoint (Day 3) must use this same function.
export function hashInviteCode(code: string): string {
  return hashKey("invite", code.trim().toUpperCase());
}

// Enrolment numbers are hashed per college, so the same number in two colleges does not match.
export function normaliseEnrollment(value: string): string {
  return value.replace(/[\s-]/g, "").toUpperCase();
}

export function hashEnrollment(slug: string, enrollmentNumber: string): string {
  return hashKey("enrollment", `${slug}:${normaliseEnrollment(enrollmentNumber)}`);
}

export async function joinPrepare(userId: string, slug: string, method: string): Promise<void> {
  const { error } = await adminClient().rpc("join_prepare", {
    p_user: userId,
    p_slug: slug,
    p_method: method,
  });
  if (error) throw mapDbError(error);
}

export async function redeemInvite(
  userId: string,
  slug: string,
  code: string,
  requestId: string,
): Promise<MembershipSummary> {
  const { data, error } = await adminClient().rpc("redeem_invite", {
    p_user: userId,
    p_slug: slug,
    p_code_hash: hashInviteCode(code),
    p_request_id: requestId,
  });
  if (error) throw mapDbError(error);
  return toSummary(data as JoinRow[]);
}

export async function submitManualJoin(
  userId: string,
  slug: string,
  input: { enrollment_number: string; program: string; grad_year: number },
  requestId: string,
): Promise<MembershipSummary> {
  const normalised = normaliseEnrollment(input.enrollment_number);
  const { data, error } = await adminClient().rpc("submit_manual_join", {
    p_user: userId,
    p_slug: slug,
    p_enrollment_hash: hashEnrollment(slug, input.enrollment_number),
    p_enrollment_last4: normalised.slice(-4),
    p_program: input.program,
    p_grad_year: input.grad_year,
    p_request_id: requestId,
  });
  if (error) throw mapDbError(error);
  return toSummary(data as JoinRow[]);
}

export async function emailDomainAllowed(slug: string, domain: string): Promise<boolean> {
  const { data, error } = await adminClient().rpc("email_domain_allowed", {
    p_slug: slug,
    p_domain: domain,
  });
  if (error) throw mapDbError(error);
  return data === true;
}

export async function completeEmailDomainJoin(
  userId: string,
  slug: string,
  domain: string,
  requestId: string,
): Promise<MembershipSummary> {
  const { data, error } = await adminClient().rpc("complete_email_domain_join", {
    p_user: userId,
    p_slug: slug,
    p_domain: domain,
    p_request_id: requestId,
  });
  if (error) throw mapDbError(error);
  return toSummary(data as JoinRow[]);
}
