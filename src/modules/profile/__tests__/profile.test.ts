import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getMyProfile,
  updateMyProfile,
  requireMembershipLevel1,
  searchSkills,
  createAvatarUploadUrl,
} from "../profile";

describe("profile module logic", () => {
  const mockUserId = "aaaaaaaa-1000-4000-8000-000000000003";

  describe("getMyProfile", () => {
    it("returns formatted profile data for an existing user", async () => {
      const mockRow = {
        user_id: mockUserId,
        display_name: "Riya Sharma",
        handle: "riya_alpha",
        headline: "Second year CSE",
        bio: "Web developer",
        avatar_path: "https://example.com/avatar.png",
        interests: ["web", "design"],
        career_goal: "Frontend Engineer",
        visibility: "college",
        portfolio_public: false,
        created_at: "2026-10-31T09:00:00Z",
        updated_at: "2026-10-31T09:00:00Z",
      };

      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: mockRow, error: null }),
            }),
          }),
        }),
      } as unknown as SupabaseClient;

      const profile = await getMyProfile(mockSupabase, mockUserId);
      expect(profile.display_name).toBe("Riya Sharma");
      expect(profile.avatar_url).toBe("https://example.com/avatar.png");
      expect(profile.visibility).toBe("college");
    });

    it("throws NOT_FOUND when profile does not exist", async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        }),
      } as unknown as SupabaseClient;

      await expect(getMyProfile(mockSupabase, mockUserId)).rejects.toThrowError(
        expect.objectContaining({ code: "NOT_FOUND" }),
      );
    });
  });

  describe("updateMyProfile", () => {
    it("throws CONFLICT (409) if handle is taken (code 23505)", async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              error: { code: "23505", message: "duplicate key value violates unique constraint" },
            }),
          }),
        }),
      } as unknown as SupabaseClient;

      await expect(
        updateMyProfile(mockSupabase, mockUserId, { handle: "taken_handle" }),
      ).rejects.toThrowError(expect.objectContaining({ code: "CONFLICT" }));
    });
  });

  describe("requireMembershipLevel1", () => {
    it("allows active member with verification_level >= 1", async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [{ id: "mem-1", status: "active", verification_level: 2 }],
              error: null,
            }),
          }),
        }),
      } as unknown as SupabaseClient;

      await expect(requireMembershipLevel1(mockSupabase, mockUserId)).resolves.toBeUndefined();
    });

    it("rejects when membership is pending", async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [{ id: "mem-1", status: "pending", verification_level: 1 }],
              error: null,
            }),
          }),
        }),
      } as unknown as SupabaseClient;

      await expect(requireMembershipLevel1(mockSupabase, mockUserId)).rejects.toThrowError(
        expect.objectContaining({ code: "MEMBERSHIP_NOT_ACTIVE" }),
      );
    });

    it("rejects when level is 0", async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [{ id: "mem-1", status: "active", verification_level: 0 }],
              error: null,
            }),
          }),
        }),
      } as unknown as SupabaseClient;

      await expect(requireMembershipLevel1(mockSupabase, mockUserId)).rejects.toThrowError(
        expect.objectContaining({ code: "VERIFICATION_LEVEL_TOO_LOW" }),
      );
    });
  });

  describe("searchSkills", () => {
    it("returns matching approved skills", async () => {
      const mockSkills = [
        { id: "88888888-8888-4888-8888-888888888888", name: "TypeScript", category: "Programming" },
      ];

      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              ilike: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({ data: mockSkills, error: null }),
              }),
            }),
          }),
        }),
      } as unknown as SupabaseClient;

      const results = await searchSkills(mockSupabase, "Type");
      expect(results).toHaveLength(1);
      expect(results[0]?.name).toBe("TypeScript");
    });
  });

  describe("createAvatarUploadUrl", () => {
    it("returns signed upload url and storage path", async () => {
      const mockSupabase = {
        storage: {
          from: vi.fn().mockReturnValue({
            createSignedUploadUrl: vi.fn().mockResolvedValue({
              data: { signedUrl: "https://storage.example.com/upload-signed" },
              error: null,
            }),
          }),
        },
      } as unknown as SupabaseClient;

      const res = await createAvatarUploadUrl(mockSupabase, mockUserId, {
        file_name: "me.png",
        content_type: "image/png",
        file_size: 50000,
      });

      expect(res.upload_url).toBe("https://storage.example.com/upload-signed");
      expect(res.path.startsWith(`${mockUserId}/`)).toBe(true);
    });
  });
});
