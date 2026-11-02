import type {
  ReportItem,
  ReportsResponse,
  CreateReportInput,
  ModerationActionInput,
} from "./types";

/**
 * Sample reports data for R4 UI development.
 * Follows RPT-01, RPT-02, and RPT-03 in docs/API_CONTRACT.md.
 * No real student names, emails, or PII.
 */
export const SAMPLE_REPORTS: ReportItem[] = [
  {
    id: "rpt-001",
    college_id: "col-acme-01",
    reporter_id: "usr-student-02",
    target_type: "team_post",
    target_id: "post-901",
    target_title: "Paid Assignment Solution Writing",
    reason: "spam",
    details: "This post is selling commercial essay writing and homework completion services.",
    status: "open",
    created_at: "2026-10-30T14:20:00Z",
  },
  {
    id: "rpt-002",
    college_id: "col-acme-01",
    reporter_id: "usr-student-03",
    target_type: "profile",
    target_id: "usr-fake-01",
    target_title: "Student Profile: John Doe (Fake Enrollment)",
    reason: "impersonation",
    details: "The profile is using a stolen name and claiming to be head of department.",
    status: "open",
    created_at: "2026-10-29T16:45:00Z",
  },
  {
    id: "rpt-003",
    college_id: "col-acme-01",
    reporter_id: "usr-student-04",
    target_type: "team_post",
    target_id: "post-850",
    target_title: "Outdated Project Pitch",
    reason: "other",
    details: "Duplicate post created three times in error by applicant.",
    status: "dismissed",
    handled_by: "usr-mod-01",
    handled_at: "2026-10-28T11:00:00Z",
    created_at: "2026-10-28T09:30:00Z",
  },
];

/**
 * Creates a report (RPT-01).
 * Replaced later with POST /api/v1/c/{slug}/reports.
 */
export async function submitReport(
  input: CreateReportInput,
): Promise<{ data: ReportItem; request_id: string }> {
  const newReport: ReportItem = {
    id: `rpt-${Date.now()}`,
    college_id: "col-acme-01",
    reporter_id: "usr-current-user",
    target_type: input.target_type,
    target_id: input.target_id,
    target_title: input.target_title,
    reason: input.reason,
    details: input.details?.trim(),
    status: "open",
    created_at: new Date().toISOString(),
  };

  SAMPLE_REPORTS.unshift(newReport);

  return {
    data: newReport,
    request_id: `req-rpt-${Date.now()}`,
  };
}

/**
 * Retrieves the moderator reports queue (RPT-02).
 * Replaced later with GET /api/v1/c/{slug}/admin/reports.
 */
export async function fetchReportsQueue(): Promise<ReportsResponse> {
  return {
    data: [...SAMPLE_REPORTS],
    meta: {
      request_id: "req-mock-rpt-queue",
      total: SAMPLE_REPORTS.length,
      next_cursor: null,
    },
  };
}

/**
 * Handles a moderator action on a report (RPT-03).
 * Actions: dismiss, hide, warn, suspend.
 */
export async function executeModeratorAction(
  input: ModerationActionInput,
): Promise<{ success: boolean; request_id: string }> {
  const item = SAMPLE_REPORTS.find((r) => r.id === input.report_id);
  if (item) {
    item.status = input.action === "dismiss" ? "dismissed" : "actioned";
    item.handled_by = "usr-mod-01";
    item.handled_at = new Date().toISOString();
  }

  return {
    success: true,
    request_id: `req-act-${Date.now()}`,
  };
}
