import { adminClient } from "@/server/admin/supabase-admin";
import { AppError } from "@/lib/errors";

export type MaintenanceResult = {
  team_posts_expired: number;
  team_requests_cancelled: number;
  join_requests_expired: number;
  idempotency_keys_deleted: number;
  rate_limit_events_deleted: number;
  notifications_deleted: number;
  waitlist_deleted: number;
};

// Runs the clean up function (migration 20261108000000). Safe to run twice.
export async function runMaintenance(): Promise<MaintenanceResult> {
  const { data, error } = await adminClient().rpc("maintenance_run");
  if (error) throw new AppError("UPSTREAM_UNAVAILABLE", { cause: error });
  return data as MaintenanceResult;
}
