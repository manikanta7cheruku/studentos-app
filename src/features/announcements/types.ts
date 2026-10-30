export type UserRole = "student" | "moderator" | "admin";

export interface AnnouncementItem {
  id: string;
  college_id: string;
  author_id: string;
  author_name: string;
  author_role: string;
  title: string;
  body: string;
  pinned: boolean;
  publish_at: string;
  expires_at?: string | null;
  status: "published" | "draft" | "archived";
}

export interface AnnouncementsResponse {
  data: AnnouncementItem[];
  meta: {
    request_id: string;
    total: number;
    next_cursor: string | null;
  };
}

export interface CreateAnnouncementInput {
  title: string;
  body: string;
  pinned?: boolean;
  expires_at?: string | null;
}
