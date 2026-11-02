export type NotificationType =
  | "verification_decision"
  | "join_request_received"
  | "join_request_decided"
  | "report_outcome"
  | "reminder";

export interface NotificationPayload {
  title?: string;
  message?: string;
  link?: string;
  status?: string;
  reason?: string;
  post_id?: string;
  post_title?: string;
  role_name?: string;
  applicant_name?: string;
  decision?: "accepted" | "declined";
  target_type?: string;
  action?: string;
  deadline?: string;
  [key: string]: unknown;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  college_id: string;
  type: NotificationType;
  title: string;
  body: string;
  payload?: NotificationPayload;
  read_at: string | null;
  created_at: string;
}

export interface NotificationsResponse {
  data: NotificationItem[];
  meta: {
    request_id: string;
    unread_count: number;
    next_cursor: string | null;
  };
}
