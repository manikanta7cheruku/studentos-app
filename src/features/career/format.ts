import type { Application, ApplicationStatus, Opportunity } from "@/lib/api/endpoints";

export const STATUSES: ApplicationStatus[] = [
  "saved",
  "applied",
  "assessment",
  "interview",
  "offer",
  "rejected",
  "withdrawn",
];

export const STATUS_LABEL: Record<ApplicationStatus, string> = {
  saved: "Saved",
  applied: "Applied",
  assessment: "Assessment",
  interview: "Interview",
  offer: "Offer",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

/** Statuses that are over: no deadline words for these. */
const CLOSED: ApplicationStatus[] = ["offer", "rejected", "withdrawn"];

export const KIND_LABEL: Record<string, string> = {
  internship: "Internship",
  job: "Job",
  hackathon: "Hackathon",
  competition: "Competition",
  scholarship: "Scholarship",
};

export const MODE_LABEL: Record<string, string> = {
  onsite: "On site",
  remote: "Remote",
  hybrid: "Hybrid",
};

const DAY = 24 * 60 * 60 * 1000;

/** Days from `now` to a YYYY-MM-DD date (a whole number of days, negative when it has passed), counted by calendar day. */
export function daysUntil(date: string, now = new Date()): number {
  const [y, m, d] = date.split("-").map(Number);
  const target = new Date(y!, (m ?? 1) - 1, d ?? 1);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target.getTime() - today.getTime()) / DAY);
}

/** "Due today", "Due in 3 days", "3 days overdue", or null when there is nothing to say. */
export function deadlineWords(
  deadline: string | null,
  status: ApplicationStatus,
  now = new Date(),
): string | null {
  if (!deadline || CLOSED.includes(status)) return null;
  const days = daysUntil(deadline, now);
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  if (days > 1) return `Due in ${days} days`;
  if (days === -1) return "1 day overdue";
  return `${Math.abs(days)} days overdue`;
}

/** Overdue means the date has passed and the application is still open (saved or applied and waiting). */
export function isOverdue(
  item: Pick<Application, "deadline" | "status">,
  now = new Date(),
): boolean {
  return (
    Boolean(item.deadline) && !CLOSED.includes(item.status) && daysUntil(item.deadline!, now) < 0
  );
}

export function formatDate(date: string | null): string {
  if (!date) return "No date";
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y!, (m ?? 1) - 1, d ?? 1).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Counts per status for the filter chips. */
export function countByStatus(
  items: Pick<Application, "status">[],
): Record<ApplicationStatus | "all", number> {
  const counts = { all: items.length } as Record<ApplicationStatus | "all", number>;
  for (const status of STATUSES) counts[status] = 0;
  for (const item of items) counts[item.status] += 1;
  return counts;
}

/**
 * The screen filters and sorts what it loaded (up to 200), so the chips and the list answer at once.
 * `deadline` puts the nearest deadline first and applications without one last.
 */
export function visibleApplications(
  items: Application[],
  options: { status: ApplicationStatus | "all"; sort: "updated" | "deadline"; q: string },
): Application[] {
  const q = options.q.trim().toLowerCase();
  const filtered = items.filter(
    (item) =>
      (options.status === "all" || item.status === options.status) &&
      (!q || `${item.company} ${item.role_title}`.toLowerCase().includes(q)),
  );
  if (options.sort === "deadline") {
    return [...filtered].sort((a, b) => {
      if (a.deadline === b.deadline) return 0;
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return a.deadline < b.deadline ? -1 : 1;
    });
  }
  return [...filtered].sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1));
}

/** "₹15,000 to ₹20,000 a month", "₹15,000 a month", or null. The API gives paise a month. */
export function stipendWords(op: Pick<Opportunity, "stipend_min" | "stipend_max">): string | null {
  const rupees = (paise: number) => `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;
  const { stipend_min: min, stipend_max: max } = op;
  if (min === null && max === null) return null;
  if (min !== null && max !== null && min !== max)
    return `${rupees(min)} to ${rupees(max)} a month`;
  return `${rupees((min ?? max)!)} a month`;
}

/** The YYYY-MM-DD part of an ISO time, in the viewer's own day, for a deadline date. */
export function dateOnlyFromIso(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
