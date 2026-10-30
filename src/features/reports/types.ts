export type ReportReason = "spam" | "harassment" | "inappropriate" | "impersonation" | "other";

export type ReportStatus = "open" | "dismissed" | "actioned";

export type ModerationActionType = "dismiss" | "hide" | "warn" | "suspend";

export interface ReportItem {
  id: string;
  college_id: string;
  reporter_id: string;
  target_type: "team_post" | "announcement" | "profile" | "comment";
  target_id: string;
  target_title?: string;
  reason: ReportReason;
  details?: string;
  status: ReportStatus;
  handled_by?: string | null;
  handled_at?: string | null;
  created_at: string;
}

export interface ModerationAction {
  id: string;
  report_id: string;
  college_id: string;
  actor_id: string;
  action: ModerationActionType;
  reason: string;
  created_at: string;
}

export interface CreateReportInput {
  target_type: "team_post" | "announcement" | "profile" | "comment";
  target_id: string;
  target_title?: string;
  reason: ReportReason;
  details?: string;
}

export interface ModerationActionInput {
  report_id: string;
  action: ModerationActionType;
  reason?: string;
}

export interface ReportsResponse {
  data: ReportItem[];
  meta: {
    request_id: string;
    total: number;
    next_cursor: string | null;
  };
}
