import type { NotificationItem, NotificationsResponse } from "./types";

/**
 * Sample notifications data for R4 UI development.
 * Follows the NTF-01 and NTF-02 contracts in docs/API_CONTRACT.md.
 * No real student names, emails, or PII.
 * Replace with R2's real API client when ready.
 */
export const SAMPLE_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "ntf-001",
    user_id: "usr-student-01",
    college_id: "col-acme-01",
    type: "join_request_received",
    title: "New join request",
    body: "A student requested to join your team for Hackathon 2026 as Frontend Developer.",
    payload: {
      post_id: "post-101",
      post_title: "Campus IoT Tracker",
      role_name: "Frontend Developer",
      applicant_name: "Student A",
    },
    read_at: null,
    created_at: "2026-10-30T10:30:00Z",
  },
  {
    id: "ntf-002",
    user_id: "usr-student-01",
    college_id: "col-acme-01",
    type: "reminder",
    title: "Application deadline approaching",
    body: "Your application for Summer Research Internship is due in 48 hours.",
    payload: {
      title: "Summer Research Internship",
      deadline: "2026-11-02T18:00:00Z",
    },
    read_at: null,
    created_at: "2026-10-29T14:15:00Z",
  },
  {
    id: "ntf-003",
    user_id: "usr-student-01",
    college_id: "col-acme-01",
    type: "verification_decision",
    title: "Membership verified",
    body: "Your college verification request was approved. Welcome to your college space!",
    payload: {
      status: "approved",
    },
    read_at: "2026-10-28T09:00:00Z",
    created_at: "2026-10-28T08:45:00Z",
  },
  {
    id: "ntf-004",
    user_id: "usr-student-01",
    college_id: "col-acme-01",
    type: "report_outcome",
    title: "Report reviewed",
    body: "A moderator reviewed the content you reported. Thank you for keeping your college safe.",
    payload: {
      target_type: "team_post",
      action: "resolved",
    },
    read_at: "2026-10-27T16:20:00Z",
    created_at: "2026-10-27T15:00:00Z",
  },
];

/**
 * Returns mock notification response behind a function.
 * Later swap this for real GET /api/v1/me/notifications (NTF-01).
 */
export async function fetchNotifications(): Promise<NotificationsResponse> {
  // Simulate async delay for realistic UI state handling
  return {
    data: [...SAMPLE_NOTIFICATIONS],
    meta: {
      request_id: "req-mock-ntf-01",
      unread_count: SAMPLE_NOTIFICATIONS.filter((n) => !n.read_at).length,
      next_cursor: null,
    },
  };
}

/**
 * Returns the current unread notifications count.
 */
export async function fetchUnreadCount(): Promise<number> {
  return SAMPLE_NOTIFICATIONS.filter((n) => !n.read_at).length;
}

/**
 * Marks a notification as read (NTF-02).
 * Later swap this for real POST /api/v1/me/notifications/read.
 */
export async function markNotificationAsRead(
  notificationId: string,
): Promise<{ success: boolean; request_id: string }> {
  const item = SAMPLE_NOTIFICATIONS.find((n) => n.id === notificationId);
  if (item) {
    item.read_at = new Date().toISOString();
  }
  return { success: true, request_id: "req-mock-ntf-02" };
}

/**
 * Marks all notifications as read.
 */
export async function markAllNotificationsAsRead(): Promise<{
  success: boolean;
  request_id: string;
}> {
  const now = new Date().toISOString();
  for (const n of SAMPLE_NOTIFICATIONS) {
    if (!n.read_at) {
      n.read_at = now;
    }
  }
  return { success: true, request_id: "req-mock-ntf-all" };
}
