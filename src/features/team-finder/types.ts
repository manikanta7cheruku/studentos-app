export type PostKind = "project" | "startup" | "hackathon" | "competition";

export type PostStatus = "open" | "closed" | "filled" | "expired";

export interface TeamRole {
  id: string;
  role_name: string;
  slots: number;
  filled: number;
  skills: string[];
}

export interface TeamPost {
  id: string;
  kind: PostKind;
  title: string;
  description: string;
  deadline: string | null;
  status: PostStatus;
  roles: TeamRole[];
  created_at?: string;
  external_link?: string;
}

export interface TeamPostFilters {
  kind?: PostKind | "all" | "";
  skill?: string;
  status?: PostStatus | "all" | "";
  q?: string;
}

export type JoinRequestErrorCode = "DUPLICATE_REQUEST" | "SLOTS_FULL";

export interface JoinRequestError {
  code: JoinRequestErrorCode;
  message: string;
  fieldId?: string;
}

export interface JoinRequestInput {
  postId: string;
  roleId: string;
  message: string;
}
