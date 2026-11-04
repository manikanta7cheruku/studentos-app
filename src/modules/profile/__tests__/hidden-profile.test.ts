import { describe, expect, it, vi } from "vitest";
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

  it("excludes hidden profiles from the college people directory list", async () => {
    // Database query for directory has .eq("visibility", "college")
    // If user A is hidden, the query returns only visible members (e.g. user B)
    const mockVisibleRows = [
      {
        user_id: userB,
        display_name: "Kabir Rao",
        handle: "kabir_alpha",
        headline: "Peer student",
        avatar_path: null,
        interests: ["algorithms"],
      },
    ];

    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                is: vi.fn().mockResolvedValue({ data: mockVisibleRows, error: null }),
              }),
            }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    const people = await getVisibleCollegePeople(mockSupabase, "alpha");
    expect(people).toHaveLength(1);
    expect(people[0]?.user_id).toBe(userB);
    // User A (hidden) is not present
    expect(people.some((p) => p.user_id === userA)).toBe(false);
  });

  it("includes profile in people directory once visibility is set back to 'college'", async () => {
    const mockVisibleRows = [
      {
        user_id: userA,
        display_name: "Riya Sharma",
        handle: "riya_alpha",
        headline: "Visible student",
        avatar_path: null,
        interests: ["web"],
      },
      {
        user_id: userB,
        display_name: "Kabir Rao",
        handle: "kabir_alpha",
        headline: "Peer student",
        avatar_path: null,
        interests: ["algorithms"],
      },
    ];

    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                is: vi.fn().mockResolvedValue({ data: mockVisibleRows, error: null }),
              }),
            }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    const people = await getVisibleCollegePeople(mockSupabase, "alpha");
    expect(people).toHaveLength(2);
    expect(people.some((p) => p.user_id === userA)).toBe(true);
  });
});
