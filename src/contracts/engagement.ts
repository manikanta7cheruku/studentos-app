import { z } from "zod";
import { email, isoDateTime, paginationQuery, responseMeta, successEnvelope, uuid } from "./common";

// ---------------------------------------------------------------------------
// Notifications (NTF-01, NTF-02). payload holds ids and titles only, no personal data.
// ---------------------------------------------------------------------------
export const notificationType = z.enum([
  "membership.approved",
  "membership.rejected",
  "announcement.published",
  "report.actioned",
  "moderation.warned",
  "moderation.hidden",
  "team.request_received",
  "team.request_accepted",
  "team.request_declined",
  "team.request_cancelled",
  "team.request_withdrawn",
  "team.post_expired",
  "membership.expired",
  "opportunity.deadline_soon",
  "team.joined",
  "content.removed",
  "venue.booking_requested",
  "venue.booking_confirmed",
  "venue.booking_declined",
  "venue.booking_cancelled",
  "dm.received",
]);
// payload always has a short `title` and `message` (plain text for the bell and the list), plus ids such as
// announcement_id, report_id or college_slug that the screen can turn into a link.
export const notificationPayload = z
  .object({ title: z.string().min(1), message: z.string().min(1) })
  .catchall(z.unknown());
export const notification = z.object({
  id: uuid,
  type: notificationType,
  payload: notificationPayload,
  read_at: isoDateTime.nullable(),
  created_at: isoDateTime,
});
// NTF-01 GET /api/v1/me/notifications
export const notificationListQuery = paginationQuery.extend({
  unread: z.enum(["true", "false"]).optional(),
});
// meta.unread_count is the number of unread notifications of the person (not only on this page).
export const notificationListResponse = z.object({
  data: z.array(notification),
  meta: responseMeta.extend({ unread_count: z.number().int().min(0) }),
});
// NTF-02 POST /api/v1/me/notifications/read
export const notificationReadBody = z.union([
  z.strictObject({ ids: z.array(uuid).min(1).max(100) }),
  z.strictObject({ all: z.literal(true) }),
]);
export const notificationReadResponse = successEnvelope(
  z.object({ updated: z.number().int().min(0) }),
);

// ---------------------------------------------------------------------------
// Announcements (ANN-01 read, ANN-02 manage by moderator or admin)
// ---------------------------------------------------------------------------
export const announcementStatus = z.enum(["draft", "published", "expired", "removed"]);
export const announcement = z.object({
  id: uuid,
  author: z.object({ user_id: uuid.nullable(), display_name: z.string() }),
  title: z.string().min(1).max(120),
  body: z.string().min(1).max(5000),
  pinned: z.boolean(),
  status: announcementStatus,
  publish_at: isoDateTime,
  expires_at: isoDateTime.nullable(),
  created_at: isoDateTime,
});
// ANN-01 GET /api/v1/c/{slug}/announcements
export const announcementListResponse = successEnvelope(z.array(announcement));
// ANN-02 POST (IDEM) and PATCH /api/v1/c/{slug}/admin/announcements
export const announcementCreateBody = z.strictObject({
  title: z.string().trim().min(1).max(120),
  body: z.string().trim().min(1).max(5000),
  pinned: z.boolean().default(false),
  publish_at: isoDateTime.optional(),
  expires_at: isoDateTime.nullable().optional(),
});
export const announcementPatchBody = z
  .strictObject({
    title: z.string().trim().min(1).max(120),
    body: z.string().trim().min(1).max(5000),
    pinned: z.boolean(),
    publish_at: isoDateTime,
    expires_at: isoDateTime.nullable(),
    status: z.enum(["draft", "published", "removed"]),
  })
  .partial()
  .refine((body) => Object.keys(body).length > 0, "Send at least one field");
export const announcementResponse = successEnvelope(announcement);
// GET /api/v1/c/{slug}/admin/announcements: the management list for moderators (drafts and removed ones too).
export const adminAnnouncementListResponse = successEnvelope(z.array(announcement));

// ---------------------------------------------------------------------------
// Reports (RPT-01 create, RPT-02 queue, RPT-03 action)
// ---------------------------------------------------------------------------
export const reportTargetType = z.enum([
  "profile",
  "project",
  "team_post",
  "announcement",
  "idea",
  "idea_comment",
  "event",
  "listing",
  "venue",
]);
export const reportReason = z.enum([
  "spam",
  "harassment",
  "inappropriate",
  "impersonation",
  "scam",
  "other",
]);
export const reportStatus = z.enum(["open", "dismissed", "actioned"]);

// RPT-01 POST /api/v1/c/{slug}/reports (IDEM). One open report per reporter and target.
export const reportCreateBody = z.strictObject({
  target_type: reportTargetType,
  target_id: uuid,
  reason: reportReason,
  details: z.string().trim().max(1000).optional(),
});
export const reportCreateResponse = successEnvelope(
  z.object({ id: uuid, status: z.literal("open"), created_at: isoDateTime }),
);

// RPT-02 GET /api/v1/c/{slug}/admin/reports
export const reportQueueQuery = paginationQuery.extend({ status: reportStatus.optional() });
export const reportItem = z.object({
  id: uuid,
  target_type: reportTargetType,
  target_id: uuid,
  // The title of the reported announcement or the name of the reported person, so the queue is readable.
  target_title: z.string().nullable(),
  reason: reportReason,
  details: z.string().nullable(),
  status: reportStatus,
  reporter: z.object({ user_id: uuid.nullable(), display_name: z.string() }),
  handled_by: uuid.nullable(),
  handled_at: isoDateTime.nullable(),
  created_at: isoDateTime,
});
export const reportQueueResponse = successEnvelope(z.array(reportItem));

// RPT-03 POST /api/v1/c/{slug}/admin/reports/{id}/action (IDEM). Every action except dismiss needs a note.
export const reportActionBody = z
  .strictObject({
    action: z.enum(["dismiss", "hide", "warn", "suspend"]),
    note: z.string().trim().min(5).max(500).optional(),
  })
  .superRefine((body, ctx) => {
    if (body.action !== "dismiss" && body.note === undefined) {
      ctx.addIssue({ code: "custom", path: ["note"], message: "A note is needed for this action" });
    }
  });
export const reportActionResponse = successEnvelope(
  z.object({
    report: z.object({
      id: uuid,
      status: z.enum(["dismissed", "actioned"]),
      handled_by: uuid,
      handled_at: isoDateTime,
    }),
  }),
);

// ---------------------------------------------------------------------------
// Blocks (RPT-04): PUT and DELETE /api/v1/me/blocks/{user_id}
// ---------------------------------------------------------------------------
export const blockResponse = successEnvelope(z.object({ blocked: z.boolean() }));

// RPT-05 GET /api/v1/me/blocks: the people I blocked, newest first (so I can unblock them from Settings).
export const blockedPerson = z.object({
  user_id: uuid,
  display_name: z.string(),
  avatar_url: z.string().nullable(),
  blocked_at: isoDateTime,
});
export const blocksListResponse = successEnvelope(z.array(blockedPerson));

// ---------------------------------------------------------------------------
// Waitlist (WL-01), used by the landing page. consent must be true. The server stamps consent_at.
// ---------------------------------------------------------------------------
export const waitlistBody = z.strictObject({
  college_name: z.string().trim().min(1).max(120),
  contact_name: z.string().trim().min(1).max(120),
  contact_email: email,
  role: z.enum(["student", "faculty", "college_admin", "other"]),
  consent: z.literal(true),
  source: z.string().trim().max(40).optional(),
});
export const waitlistResponse = successEnvelope(z.object({ joined: z.literal(true) }));
