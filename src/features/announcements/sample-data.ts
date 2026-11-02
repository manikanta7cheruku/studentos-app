import type { AnnouncementItem, AnnouncementsResponse, CreateAnnouncementInput } from "./types";

/**
 * Sample announcements data for R4 UI development.
 * Follows ANN-01 and ANN-02 in docs/API_CONTRACT.md.
 * No real student names, emails, or PII.
 */
export const SAMPLE_ANNOUNCEMENTS: AnnouncementItem[] = [
  {
    id: "ann-001",
    college_id: "col-acme-01",
    author_id: "usr-admin-01",
    author_name: "Academic Affairs Office",
    author_role: "College Administrator",
    title: "Fall Semester Exam Schedule and Hall Tickets",
    body: "The final examination schedule for the current term has been published. Hall tickets will be downloadable starting next Monday through your college portal. Please ensure you carry a valid college identification card to all examination halls.",
    pinned: true,
    publish_at: "2026-10-25T09:00:00Z",
    expires_at: "2026-11-20T23:59:59Z",
    status: "published",
  },
  {
    id: "ann-002",
    college_id: "col-acme-01",
    author_id: "usr-mod-01",
    author_name: "Campus Security & Safety",
    author_role: "Campus Moderator",
    title: "Library Extended Hours for Hackathon Weekend",
    body: "The central library and computer labs will remain open 24 hours during the upcoming inter-college hackathon weekend. Student ID badges will be checked at the entrance after 10 PM. Coffee and water stations will be available on the second floor.",
    pinned: true,
    publish_at: "2026-10-28T11:30:00Z",
    expires_at: "2026-11-05T23:59:59Z",
    status: "published",
  },
  {
    id: "ann-003",
    college_id: "col-acme-01",
    author_id: "usr-admin-01",
    author_name: "Student Welfare Committee",
    author_role: "College Administrator",
    title: "Annual Sports and Cultural Fest Registration Open",
    body: "Team registrations for athletic tournaments and cultural showcases are now open. Visit the student council desk in the main quad between 12 PM and 4 PM to sign up your contingent or submit your project display requests.",
    pinned: false,
    publish_at: "2026-10-29T14:00:00Z",
    expires_at: null,
    status: "published",
  },
  {
    id: "ann-004",
    college_id: "col-acme-01",
    author_id: "usr-mod-01",
    author_name: "Career & Placement Cell",
    author_role: "Campus Moderator",
    title: "Upcoming Tech Company Placement Orientation",
    body: "An introductory orientation for final and pre-final year students interested in software engineering roles will be conducted in Auditorium B this Thursday at 3 PM. Registration is required via the placement desk.",
    pinned: false,
    publish_at: "2026-10-27T10:00:00Z",
    expires_at: null,
    status: "published",
  },
];

/**
 * Returns announcements sorted with pinned items first, then by publish date desc.
 * Replaces with GET /api/v1/c/{slug}/announcements (ANN-01).
 */
export async function fetchAnnouncements(): Promise<AnnouncementsResponse> {
  const sorted = [...SAMPLE_ANNOUNCEMENTS].sort((a, b) => {
    if (a.pinned !== b.pinned) {
      return a.pinned ? -1 : 1;
    }
    return new Date(b.publish_at).getTime() - new Date(a.publish_at).getTime();
  });

  return {
    data: sorted,
    meta: {
      request_id: "req-mock-ann-01",
      total: sorted.length,
      next_cursor: null,
    },
  };
}

/**
 * Creates a new announcement (ANN-02).
 * Admin and moderator only on backend.
 */
export async function createAnnouncement(
  input: CreateAnnouncementInput,
): Promise<{ data: AnnouncementItem; request_id: string }> {
  const newAnnouncement: AnnouncementItem = {
    id: `ann-${Date.now()}`,
    college_id: "col-acme-01",
    author_id: "usr-admin-current",
    author_name: "College Moderator",
    author_role: "Campus Moderator",
    title: input.title.trim(),
    body: input.body.trim(),
    pinned: Boolean(input.pinned),
    publish_at: new Date().toISOString(),
    expires_at: input.expires_at || null,
    status: "published",
  };

  SAMPLE_ANNOUNCEMENTS.unshift(newAnnouncement);

  return {
    data: newAnnouncement,
    request_id: `req-ann-${Date.now()}`,
  };
}
