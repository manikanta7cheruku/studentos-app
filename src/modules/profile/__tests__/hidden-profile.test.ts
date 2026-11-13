import { describe, expect, it, vi } from "vitest";

// The private details (sex, birth year, number) come from the server only. Not needed for what these tests check.
vi.mock("../../social/social.admin", () => ({
  getContributions: async () => null,
  getFollowInfo: async () => ({ followers: 0, following: 0, i_follow: false }),
}));
vi.mock("../profile-private.admin", () => ({
  getPrivate: async () => ({
    sex: null,
    birth_year: null,
    phone: null,
    phone_visibility: "hidden",
  }),
  setPrivate: async () => undefined,
}));
import type { SupabaseClient } from "@supabase/supabase-js";
import { getMyProfile, getMemberProfile, getVisibleCollegePeople } from "../profile";

describe("hidden-profile rule enforcement", () => {
  const userA = "aaaaaaaa-1000-4000-8000-000000000003"; // Riya (User A)
  const userB = "aaaaaaaa-1000-4000-8000-000000000004"; // Kabir (User B, peer in same college)

  it("allows user to view their own profile even when visibility is 'hidden'", async () => {
    const hiddenProfileRow = {
      user_id: userA,
      display_name: "Riya Sharma",
      handle: "riya_hidden",
      headline: "Private student",
      bio: "Hidden bio",
      avatar_path: null,
      interests: ["privacy"],
      career_goal: null,
      visibility: "hidden",
      portfolio_public: false,
      created_at: "2026-10-31T09:00:00Z",
      updated_at: "2026-10-31T09:00:00Z",
    };

    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: hiddenProfileRow, error: null }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    const profile = await getMyProfile(mockSupabase, userA);
    expect(profile.user_id).toBe(userA);
    expect(profile.visibility).toBe("hidden");
  });

  it("refuses another member from viewing a hidden profile (returns 404 NOT_FOUND)", async () => {
    // When querying for someone else's profile, getMemberProfile filters for visibility = 'college'
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              is: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    await expect(getMemberProfile(mockSupabase, userA, userB)).rejects.toThrowError(
      expect.objectContaining({ code: "NOT_FOUND" }),
    );
  });

  const college = "bbbbbbbb-0000-4000-8000-000000000001";
  const rpcClient = (rows: unknown[]) => {
    const rpc = vi.fn().mockResolvedValue({ data: rows, error: null });
    return { client: { rpc } as unknown as SupabaseClient, rpc };
  };

  it("reads the directory through the database function, which hides hidden profiles", async () => {
    const { client, rpc } = rpcClient([
      {
        user_id: userB,
        display_name: "Kabir Rao",
        handle: "kabir_alpha",
        headline: "Peer student",
        avatar_path: null,
        interests: ["algorithms"],
      },
    ]);
    const people = await getVisibleCollegePeople(client, college, { query: "Kab" });
    expect(rpc).toHaveBeenCalledWith("directory_list", {
      p_college: college,
      p_q: "Kab",
      p_limit: 50,
    });
    expect(people).toHaveLength(1);
    expect(people[0]?.user_id).toBe(userB);
    expect(people.some((p) => p.user_id === userA)).toBe(false);
  });

  it("turns a database error into a safe upstream error", async () => {
    const client = {
      rpc: vi.fn().mockResolvedValue({ data: null, error: { code: "XX000", message: "boom" } }),
    } as unknown as SupabaseClient;
    await expect(getVisibleCollegePeople(client, college)).rejects.toThrowError(
      expect.objectContaining({ code: "UPSTREAM_UNAVAILABLE" }),
    );
  });
});
