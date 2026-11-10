import type { TeamPost, TeamPostKind } from "@/lib/api/endpoints";

export const KIND_LABEL: Record<TeamPostKind, string> = {
  project: "Project",
  startup: "Startup",
  hackathon: "Hackathon",
  competition: "Competition",
};

export const KINDS = Object.keys(KIND_LABEL) as TeamPostKind[];

const STATUS_LABEL: Record<TeamPost["status"], string> = {
  open: "Open",
  closed: "Closed",
  filled: "Team is full",
  expired: "Expired",
};

export function statusLabel(status: TeamPost["status"]): string {
  return STATUS_LABEL[status];
}

/** "12 Nov 2026", or the plain words when there is no deadline. */
export function formatDeadline(deadline: string | null): string {
  if (!deadline) return "No deadline";
  const date = new Date(deadline);
  if (Number.isNaN(date.getTime())) return "No deadline";
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

/** How many places are still free across all roles of a post. */
export function openSlots(post: Pick<TeamPost, "roles">): number {
  return post.roles.reduce((sum, role) => sum + Math.max(0, role.slots - role.filled), 0);
}

/** The date input value (YYYY-MM-DD) to the end of that day as an ISO time, or null for "no deadline". */
export function deadlineFromDate(value: string): string | null {
  if (!value) return null;
  const date = new Date(`${value}T23:59:59`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** The YYYY-MM-DD part for a date input, in the viewer's own day. */
export function dateInputValue(deadline: string | null): string {
  if (!deadline) return "";
  const date = new Date(deadline);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Today plus `days`, as YYYY-MM-DD for the min and max of a date input. */
export function dateInputOffset(days: number, now = new Date()): string {
  const date = new Date(now);
  date.setDate(date.getDate() + days);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
