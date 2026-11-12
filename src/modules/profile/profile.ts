import type { SupabaseClient } from "@supabase/supabase-js";
import type { z } from "zod";
import type { avatarUploadUrlBody, profilePatchBody, skillsPutBody } from "@/contracts";
import { AppError } from "@/lib/errors";
import { mapDbError } from "@/lib/db-error";
import { toIso } from "@/lib/api";
import { serverEnv } from "@/lib/env";
import { getPrivate, setPrivate } from "./profile-private.admin";

export async function getMyProfile(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new AppError("UPSTREAM_UNAVAILABLE", { cause: error });
  }

  if (!data) {
    throw new AppError("NOT_FOUND", { message: "Profile not found." });
  }

  let avatarUrl: string | null = null;
  if (data.avatar_path) {
    if (data.avatar_path.startsWith("http://") || data.avatar_path.startsWith("https://")) {
      avatarUrl = data.avatar_path;
    } else {
      const { data: pubData } = supabase.storage.from("avatars").getPublicUrl(data.avatar_path);
      avatarUrl = pubData?.publicUrl ?? null;
    }
  }

  const priv = await getPrivate(userId);
  const interests: string[] = data.interests ?? [];
  const techInterests: string[] = data.tech_interests ?? [];
  return {
    user_id: data.user_id,
    display_name: data.display_name,
    handle: data.handle ?? null,
    headline: data.headline ?? null,
    bio: data.bio ?? null,
    avatar_url: avatarUrl,
    interests,
    tech_interests: techInterests,
    excited_by: (data.excited_by as string | null) ?? null,
    career_goal: data.career_goal ?? null,
    visibility: (data.visibility as "college" | "hidden") ?? "college",
    portfolio_public: Boolean(data.portfolio_public),
    sex: priv.sex,
    sex_public: Boolean(priv.sex_public),
    age_public: Boolean(priv.age_public),
    birth_year: priv.birth_year,
    phone: priv.phone,
    phone_visibility: priv.phone_visibility,
    // A name, a username, sex (also "prefer not to say") and at least one interest.
    onboarded: Boolean(
      data.display_name?.trim() &&
      data.handle &&
      priv.sex &&
      interests.length + techInterests.length >= 1,
    ),
    created_at: toIso(data.created_at)!,
    updated_at: toIso(data.updated_at)!,
  };
}

export async function updateMyProfile(
  supabase: SupabaseClient,
  userId: string,
  patch: z.infer<typeof profilePatchBody>,
) {
  const updatePayload: Record<string, unknown> = {};
  if (patch.display_name !== undefined) updatePayload.display_name = patch.display_name;
  if (patch.handle !== undefined) updatePayload.handle = patch.handle;
  if (patch.headline !== undefined) updatePayload.headline = patch.headline;
  if (patch.bio !== undefined) updatePayload.bio = patch.bio;
  if (patch.interests !== undefined) updatePayload.interests = patch.interests;
  if (patch.tech_interests !== undefined) updatePayload.tech_interests = patch.tech_interests;
  if (patch.excited_by !== undefined) updatePayload.excited_by = patch.excited_by;
  if (patch.career_goal !== undefined) updatePayload.career_goal = patch.career_goal;
  if (patch.visibility !== undefined) updatePayload.visibility = patch.visibility;
  if (patch.portfolio_public !== undefined) updatePayload.portfolio_public = patch.portfolio_public;

  if (Object.keys(updatePayload).length > 0) {
    const { error } = await supabase.from("profiles").update(updatePayload).eq("user_id", userId);

    if (error) {
      if (error.code === "23505" || error.message?.includes("unique")) {
        throw new AppError("CONFLICT", { message: "That username is already taken." });
      }
      throw new AppError("UPSTREAM_UNAVAILABLE", { cause: error });
    }
  }

  // The private details go through the server only.
  const priv: Record<string, unknown> = {};
  if (patch.sex !== undefined) priv.sex = patch.sex;
  if (patch.sex_public !== undefined) priv.sex_public = patch.sex_public;
  if (patch.age_public !== undefined) priv.age_public = patch.age_public;
  if (patch.birth_year !== undefined) priv.birth_year = patch.birth_year;
  if (patch.phone !== undefined) priv.phone = patch.phone;
  if (patch.phone_visibility !== undefined) priv.phone_visibility = patch.phone_visibility;
  if (Object.keys(priv).length > 0) {
    await setPrivate(userId, priv);
  }

  return getMyProfile(supabase, userId);
}

export async function requireMembershipLevel1(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("memberships")
    .select("id, status, verification_level")
    .eq("user_id", userId);

  if (error) {
    throw new AppError("UPSTREAM_UNAVAILABLE", { cause: error });
  }

  const memberships = data ?? [];
  const active = memberships.find((m) => m.status === "active");
  if (!active) {
    throw new AppError("MEMBERSHIP_NOT_ACTIVE");
  }

  if (active.verification_level < 1) {
    throw new AppError("VERIFICATION_LEVEL_TOO_LOW");
  }
}

export async function getMySkills(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("user_skills")
    .select("skill_id, level, evidence_url, skills(name)")
    .eq("user_id", userId);

  if (error) {
    throw new AppError("UPSTREAM_UNAVAILABLE", { cause: error });
  }

  type SkillJoinRow = {
    skill_id: string;
    level: number;
    evidence_url: string | null;
    skills: { name: string } | null;
  };

  const rows = (data ?? []) as unknown as SkillJoinRow[];

  const skills = rows.map((row) => ({
    skill_id: row.skill_id,
    name: row.skills?.name ?? "Unknown skill",
    level: row.level,
    evidence_url: row.evidence_url ?? null,
  }));

  return { skills };
}

export async function updateMySkills(
  supabase: SupabaseClient,
  userId: string,
  skillsInput: z.infer<typeof skillsPutBody>["skills"],
) {
  await requireMembershipLevel1(supabase, userId);

  // One database call (one transaction): either the whole list is replaced or nothing changes.
  const { error } = await supabase.rpc("set_my_skills", {
    p_skills: skillsInput.map((s) => ({
      skill_id: s.skill_id,
      level: s.level,
      evidence_url: s.evidence_url ?? null,
    })),
  });
  if (error) throw mapDbError(error);
  return getMySkills(supabase, userId);
}

export async function searchSkills(supabase: SupabaseClient, query: string) {
  const { data, error } = await supabase
    .from("skills")
    .select("id, name, category")
    .eq("status", "approved")
    .ilike("name", `%${query.replace(/[\\%_]/g, (c) => `\\${c}`)}%`)
    .limit(20);

  if (error) {
    throw new AppError("UPSTREAM_UNAVAILABLE", { cause: error });
  }

  return (data ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    category: s.category ?? null,
  }));
}

export async function createAvatarUploadUrl(
  supabase: SupabaseClient,
  userId: string,
  body: z.infer<typeof avatarUploadUrlBody>,
) {
  const cleanFileName = body.file_name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${userId}/${Date.now()}-${cleanFileName}`;

  const { data, error } = await supabase.storage.from("avatars").createSignedUploadUrl(path);

  if (error || !data) {
    const appUrl = serverEnv().NEXT_PUBLIC_APP_URL;
    return {
      upload_url: `${appUrl}/api/v1/me/avatar?path=${encodeURIComponent(path)}`,
      path,
    };
  }

  return {
    upload_url: data.signedUrl,
    path,
  };
}

export type DirectoryPerson = {
  user_id: string;
  display_name: string;
  handle: string | null;
  headline: string | null;
  avatar_url: string | null;
  interests: string[];
};

export async function getMemberProfile(
  supabase: SupabaseClient,
  targetUserId: string,
  callerUserId: string,
) {
  // If viewing self, return own profile directly (even if hidden)
  if (targetUserId === callerUserId) {
    return getMyProfile(supabase, callerUserId);
  }

  // Viewing another user: must be visible to college and not deleted
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", targetUserId)
    .eq("visibility", "college")
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    throw new AppError("UPSTREAM_UNAVAILABLE", { cause: error });
  }

  if (!data) {
    throw new AppError("NOT_FOUND", { message: "Member not found or profile is hidden." });
  }

  let avatarUrl: string | null = null;
  if (data.avatar_path) {
    if (data.avatar_path.startsWith("http://") || data.avatar_path.startsWith("https://")) {
      avatarUrl = data.avatar_path;
    } else {
      const { data: pubData } = supabase.storage.from("avatars").getPublicUrl(data.avatar_path);
      avatarUrl = pubData?.publicUrl ?? null;
    }
  }

  return {
    user_id: data.user_id,
    display_name: data.display_name,
    handle: data.handle ?? null,
    headline: data.headline ?? null,
    bio: data.bio ?? null,
    avatar_url: avatarUrl,
    interests: data.interests ?? [],
    tech_interests: (data.tech_interests as string[] | null) ?? [],
    excited_by: (data.excited_by as string | null) ?? null,
    career_goal: data.career_goal ?? null,
    visibility: data.visibility as "college",
    portfolio_public: Boolean(data.portfolio_public),
    created_at: toIso(data.created_at)!,
    updated_at: toIso(data.updated_at)!,
  };
}

export async function getVisibleCollegePeople(
  supabase: SupabaseClient,
  collegeId: string,
  options: { query?: string } = {},
): Promise<DirectoryPerson[]> {
  // The database function checks the caller is an active member and hides hidden, blocked and deleted people.
  const { data, error } = await supabase.rpc("directory_list", {
    p_college: collegeId,
    p_q: options.query ?? null,
    p_limit: 50,
  });
  if (error) {
    throw new AppError("UPSTREAM_UNAVAILABLE", { cause: error });
  }

  type DirectoryRow = {
    user_id: string;
    display_name: string;
    handle: string | null;
    headline: string | null;
    avatar_path: string | null;
    interests: string[] | null;
  };

  const rows = (data ?? []) as unknown as DirectoryRow[];

  return rows.map((row) => {
    let avatarUrl: string | null = null;
    if (row.avatar_path) {
      if (row.avatar_path.startsWith("http://") || row.avatar_path.startsWith("https://")) {
        avatarUrl = row.avatar_path;
      } else {
        const { data: pubData } = supabase.storage.from("avatars").getPublicUrl(row.avatar_path);
        avatarUrl = pubData?.publicUrl ?? null;
      }
    }
    return {
      user_id: row.user_id,
      display_name: row.display_name,
      handle: row.handle ?? null,
      headline: row.headline ?? null,
      avatar_url: avatarUrl,
      interests: row.interests ?? [],
    };
  });
}
