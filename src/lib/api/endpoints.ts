import type { z } from "zod";
import * as c from "@/contracts";
import { apiClient, apiFetchEnvelope } from "../api-client";

// Typed calls to the real API, one function per endpoint of docs/API_CONTRACT.md. Every answer is checked against
// the contract schema (the same Zod schemas the server uses), so a screen never receives a shape it did not expect.
// Calls marked IDEM in the contract send a fresh Idempotency-Key; pass your own `key` to retry the same action.

type Data<S extends { shape: { data: z.ZodType } }> = z.infer<S["shape"]["data"]>;

export type MyCollege = z.infer<typeof c.myMembershipItem>;
export type PublicCollege = Data<typeof c.publicCollegeResponse>;
export type MyMembership = NonNullable<Data<typeof c.myMembershipResponse>["membership"]>;
export type Profile = Data<typeof c.profileResponse>;
export type MySkill = Data<typeof c.skillsPutResponse>["skills"][number];
export type SkillHit = Data<typeof c.skillSearchResponse>[number];
export type Person = Data<typeof c.personProfileResponse>;
export type NotificationItem = Data<typeof c.notificationListResponse>[number];
export type Announcement = Data<typeof c.announcementListResponse>[number];
export type TeamPost = Data<typeof c.teamPostListResponse>[number];
export type TeamPostDetail = Data<typeof c.teamPostResponse>;
export type JoinRequestItem = Data<typeof c.joinRequestListResponse>[number];
export type MyJoinRequest = Data<typeof c.myJoinRequestListResponse>[number];
export type TeamPostKind = z.infer<typeof c.teamPostKind>;
export type Application = Data<typeof c.applicationListResponse>[number];
export type ApplicationDetail = Data<typeof c.applicationResponse>;
export type ApplicationStatus = z.infer<typeof c.applicationStatus>;
export type Opportunity = Data<typeof c.opportunityResponse>;
export type OpportunityKind = z.infer<typeof c.opportunityKind>;

const j = (path: string) => path;

export const api = {
  auth: {
    requestCode: (email: string) =>
      apiClient(j("/auth/otp/request"), {
        method: "POST",
        body: { email },
        schema: c.otpRequestResponse.shape.data,
      }),
    verifyCode: (email: string, code: string) =>
      apiClient(j("/auth/otp/verify"), {
        method: "POST",
        body: { email, code },
        schema: c.otpVerifyResponse.shape.data,
      }),
    logout: (all = false) =>
      apiClient(j(all ? "/auth/logout?all=true" : "/auth/logout"), {
        method: "POST",
        schema: c.logoutResponse.shape.data,
      }),
  },

  colleges: {
    mine: () => apiClient(j("/me/memberships"), { schema: c.myMembershipsResponse.shape.data }),
    publicBySlug: (slug: string) =>
      apiClient(j(`/colleges/public/${slug}`), { schema: c.publicCollegeResponse.shape.data }),
    membership: (slug: string) =>
      apiClient(j(`/c/${slug}/me/membership`), { schema: c.myMembershipResponse.shape.data }),
    joinInvite: (slug: string, code: string, key?: string) =>
      apiClient(j(`/c/${slug}/join/invite`), {
        method: "POST",
        body: { code },
        idempotent: key ?? true,
        schema: c.joinInviteResponse.shape.data,
      }),
    joinManual: (
      slug: string,
      body: { enrollment_number: string; program: string; grad_year: number },
      key?: string,
    ) =>
      apiClient(j(`/c/${slug}/join/manual`), {
        method: "POST",
        body,
        idempotent: key ?? true,
        schema: c.joinManualResponse.shape.data,
      }),
    // Global only: join at once, unverified (level 1).
    joinOpen: (slug: string, key?: string) =>
      apiClient(j(`/c/${slug}/join/open`), {
        method: "POST",
        body: {},
        idempotent: key ?? true,
        schema: c.joinOpenResponse.shape.data,
      }),
    emailStart: (slug: string, email: string) =>
      apiClient(j(`/c/${slug}/join/email-domain`), {
        method: "POST",
        body: { step: "start", email },
        schema: c.joinEmailDomainStartResponse.shape.data,
      }),
    emailComplete: (slug: string, email: string, code: string) =>
      apiClient(j(`/c/${slug}/join/email-domain`), {
        method: "POST",
        body: { step: "complete", email, code },
        schema: c.joinEmailDomainCompleteResponse.shape.data,
      }),
    leave: (slug: string) =>
      apiClient(j(`/c/${slug}/me/leave`), { method: "POST", schema: c.leaveResponse.shape.data }),
  },

  profile: {
    get: () => apiClient(j("/me/profile"), { schema: c.profileResponse.shape.data }),
    patch: (patch: z.input<typeof c.profilePatchBody>) =>
      apiClient(j("/me/profile"), {
        method: "PATCH",
        body: patch,
        schema: c.profileResponse.shape.data,
      }),
    skills: () => apiClient(j("/me/skills"), { schema: c.skillsPutResponse.shape.data }),
    putSkills: (skills: z.input<typeof c.skillsPutBody>["skills"]) =>
      apiClient(j("/me/skills"), {
        method: "PUT",
        body: { skills },
        schema: c.skillsPutResponse.shape.data,
      }),
    searchSkills: (q: string, signal?: AbortSignal) =>
      apiClient(j(`/skills?q=${encodeURIComponent(q)}`), {
        signal,
        schema: c.skillSearchResponse.shape.data,
      }),
    // The image is sent as it is (JPEG, PNG, WebP, GIF or AVIF, up to 2 MB). The server checks the real bytes.
    uploadAvatar: (file: Blob) =>
      apiClient(j("/me/avatar"), {
        method: "POST",
        body: file,
        headers: { "Content-Type": file.type || "application/octet-stream" },
        schema: c.avatarUploadResponse.shape.data,
      }),
  },

  people: {
    list: (slug: string, q?: string) =>
      apiClient<unknown>(
        j(`/c/${slug}/people${q ? `?q=${encodeURIComponent(q)}` : ""}`),
      ) as Promise<
        {
          user_id: string;
          display_name: string;
          handle: string | null;
          headline: string | null;
          avatar_url: string | null;
          interests: string[];
        }[]
      >,
    one: (slug: string, userId: string) =>
      apiClient(j(`/c/${slug}/people/${userId}`), { schema: c.personProfileResponse.shape.data }),
  },

  notifications: {
    list: (options: { unread?: boolean; limit?: number; cursor?: string } = {}) => {
      const query = new URLSearchParams();
      if (options.unread) query.set("unread", "true");
      if (options.limit) query.set("limit", String(options.limit));
      if (options.cursor) query.set("cursor", options.cursor);
      const suffix = query.size ? `?${query}` : "";
      return apiFetchEnvelope(j(`/me/notifications${suffix}`), {
        schema: c.notificationListResponse.shape.data,
      });
    },
    markRead: (body: { ids: string[] } | { all: true }) =>
      apiClient(j("/me/notifications/read"), {
        method: "POST",
        body,
        schema: c.notificationReadResponse.shape.data,
      }),
  },

  announcements: {
    list: (slug: string, cursor?: string) =>
      apiFetchEnvelope(j(`/c/${slug}/announcements?limit=20${cursor ? `&cursor=${cursor}` : ""}`), {
        schema: c.announcementListResponse.shape.data,
      }),
  },

  teamPosts: {
    list: (
      slug: string,
      filters: {
        kind?: TeamPostKind;
        status?: "open" | "closed" | "filled" | "expired" | "all";
        q?: string;
        mine?: boolean;
        cursor?: string;
        limit?: number;
      } = {},
    ) => {
      const query = new URLSearchParams();
      if (filters.kind) query.set("kind", filters.kind);
      if (filters.status) query.set("status", filters.status);
      if (filters.q) query.set("q", filters.q);
      if (filters.mine) query.set("mine", "true");
      if (filters.cursor) query.set("cursor", filters.cursor);
      query.set("limit", String(filters.limit ?? 20));
      return apiFetchEnvelope(j(`/c/${slug}/team-posts?${query}`), {
        schema: c.teamPostListResponse.shape.data,
      });
    },
    one: (slug: string, id: string) =>
      apiClient(j(`/c/${slug}/team-posts/${id}`), { schema: c.teamPostResponse.shape.data }),
    create: (slug: string, body: z.input<typeof c.teamPostCreateBody>, key?: string) =>
      apiClient(j(`/c/${slug}/team-posts`), {
        method: "POST",
        body,
        idempotent: key ?? true,
        schema: c.teamPostResponse.shape.data,
      }),
    patch: (slug: string, id: string, body: z.input<typeof c.teamPostPatchBody>) =>
      apiClient(j(`/c/${slug}/team-posts/${id}`), {
        method: "PATCH",
        body,
        schema: c.teamPostResponse.shape.data,
      }),
    close: (slug: string, id: string) =>
      apiClient(j(`/c/${slug}/team-posts/${id}/close`), {
        method: "POST",
        body: {},
        schema: c.teamPostResponse.shape.data,
      }),
    request: (slug: string, id: string, roleId: string, message: string, key?: string) =>
      apiClient(j(`/c/${slug}/team-posts/${id}/roles/${roleId}/requests`), {
        method: "POST",
        body: { message },
        idempotent: key ?? true,
        schema: c.joinRequestCreateResponse.shape.data,
      }),
    requests: (slug: string, id: string, status?: "pending" | "accepted" | "declined") =>
      apiClient(j(`/c/${slug}/team-posts/${id}/requests${status ? `?status=${status}` : ""}`), {
        schema: c.joinRequestListResponse.shape.data,
      }),
    decide: (
      slug: string,
      requestId: string,
      decision: "accepted" | "declined",
      note?: string,
      key?: string,
    ) =>
      apiClient(j(`/c/${slug}/join-requests/${requestId}/decision`), {
        method: "POST",
        body: note ? { decision, note } : { decision },
        idempotent: key ?? true,
        schema: c.joinRequestDecisionResponse.shape.data,
      }),
    withdraw: (slug: string, requestId: string) =>
      apiClient(j(`/c/${slug}/join-requests/${requestId}`), {
        method: "DELETE",
        schema: c.joinRequestWithdrawResponse.shape.data,
      }),
    myRequests: (slug: string, status?: string) =>
      apiClient(j(`/c/${slug}/me/join-requests${status ? `?status=${status}` : ""}`), {
        schema: c.myJoinRequestListResponse.shape.data,
      }),
  },

  applications: {
    list: () =>
      apiClient(j("/me/applications?sort=updated"), {
        schema: c.applicationListResponse.shape.data,
      }),
    one: (id: string) =>
      apiClient(j(`/me/applications/${id}`), { schema: c.applicationResponse.shape.data }),
    create: (body: z.input<typeof c.applicationCreateBody>, key?: string) =>
      apiClient(j("/me/applications"), {
        method: "POST",
        body,
        idempotent: key ?? true,
        schema: c.applicationResponse.shape.data,
      }),
    // `version` is the number the screen last saw. A stale one is refused with VERSION_CONFLICT.
    patch: (id: string, body: z.input<typeof c.applicationPatchBody>, version: number) =>
      apiClient(j(`/me/applications/${id}`), {
        method: "PATCH",
        body,
        headers: { "If-Match": String(version) },
        schema: c.applicationResponse.shape.data,
      }),
    status: (id: string, status: ApplicationStatus, note: string, version: number) =>
      apiClient(j(`/me/applications/${id}/status`), {
        method: "POST",
        body: note ? { status, note } : { status },
        headers: { "If-Match": String(version) },
        schema: c.applicationResponse.shape.data,
      }),
    remove: (id: string) =>
      apiClient(j(`/me/applications/${id}`), {
        method: "DELETE",
        schema: c.applicationDeleteResponse.shape.data,
      }),
  },

  opportunities: {
    list: (
      slug: string,
      filters: {
        kinds?: OpportunityKind[];
        mode?: "onsite" | "remote" | "hybrid";
        q?: string;
        saved?: boolean;
        deadline?: "any" | "7d" | "30d" | "hide_closed";
        cursor?: string;
      } = {},
    ) => {
      const query = new URLSearchParams();
      if (filters.kinds?.length) query.set("kind", filters.kinds.join(","));
      if (filters.mode) query.set("mode", filters.mode);
      if (filters.q) query.set("q", filters.q);
      if (filters.saved) query.set("saved", "true");
      if (filters.deadline) query.set("deadline", filters.deadline);
      if (filters.cursor) query.set("cursor", filters.cursor);
      query.set("limit", "20");
      return apiFetchEnvelope(j(`/c/${slug}/opportunities?${query}`), {
        schema: c.opportunityListResponse.shape.data,
      });
    },
    one: (slug: string, id: string) =>
      apiClient(j(`/c/${slug}/opportunities/${id}`), {
        schema: c.opportunityResponse.shape.data,
      }),
    save: (id: string) =>
      apiClient(j(`/me/saved-opportunities/${id}`), {
        method: "PUT",
        schema: c.savedOpportunityResponse.shape.data,
      }),
    unsave: (id: string) =>
      apiClient(j(`/me/saved-opportunities/${id}`), {
        method: "DELETE",
        schema: c.savedOpportunityResponse.shape.data,
      }),
  },

  reminders: {
    get: () =>
      apiClient(j("/me/reminder-settings"), { schema: c.reminderSettingsResponse.shape.data }),
    set: (enabled: boolean) =>
      apiClient(j("/me/reminder-settings"), {
        method: "PUT",
        body: { enabled },
        schema: c.reminderSettingsResponse.shape.data,
      }),
  },

  account: {
    // Step 1 emails a code to my address, step 2 deletes everything (docs/API_CONTRACT.md AUTH-04).
    requestDeletion: () => apiClient(j("/me"), { method: "DELETE", body: {} }),
    confirmDeletion: (code: string) => apiClient(j("/me"), { method: "DELETE", body: { code } }),
  },
};
