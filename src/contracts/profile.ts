import { z } from "zod";
import { httpsUrl, isoDateTime, successEnvelope, uuid } from "./common";

// PRF-01 GET / PATCH /api/v1/me/profile
export const profileVisibility = z.enum(["college", "hidden"]);
// Private details (never shown to classmates). "prefer_not_to_say" counts as an answer.
export const sexChoice = z.enum(["woman", "man", "non_binary", "prefer_not_to_say"]);
// hidden: nobody sees the number. hosts: the host of a plan I joined sees it, until a day after the plan.
export const phoneVisibility = z.enum(["hidden", "hosts"]);
export const phoneNumber = z.string().regex(/^\+[1-9][0-9]{7,14}$/, "Use the form +919876543210");

export const profile = z.object({
  user_id: uuid,
  display_name: z.string().min(1).max(80),
  handle: z
    .string()
    .regex(/^[a-z0-9_]{3,30}$/)
    .nullable(),
  headline: z.string().max(120).nullable(),
  bio: z.string().max(1000).nullable(),
  avatar_url: z.url().nullable(),
  // Casual interests (football, movies, music) and technical ones, kept apart.
  interests: z.array(z.string().min(1).max(40)).max(20),
  tech_interests: z.array(z.string().min(1).max(40)).max(20).default([]),
  // One line: what makes this person excited.
  excited_by: z.string().max(200).nullable().default(null),
  career_goal: z.string().max(200).nullable(),
  visibility: profileVisibility,
  portfolio_public: z.boolean(),
  // Private, only in my own profile.
  sex: sexChoice.nullable().default(null),
  // True when I chose to show my gender on my profile. Off by default.
  sex_public: z.boolean().default(false),
  birth_year: z.number().int().min(1940).max(2030).nullable().default(null),
  phone: phoneNumber.nullable().default(null),
  phone_visibility: phoneVisibility.default("hidden"),
  // True when the name, a username, sex and at least one interest are set. The app asks for them once, in a short tour.
  onboarded: z.boolean().default(false),
  created_at: isoDateTime,
  updated_at: isoDateTime,
});
export const profileResponse = successEnvelope(profile);

export const profilePatchBody = z
  .strictObject({
    display_name: z.string().trim().min(1).max(80),
    handle: z
      .string()
      .regex(/^[a-z0-9_]{3,30}$/)
      .nullable(),
    headline: z.string().trim().max(120).nullable(),
    bio: z.string().trim().max(1000).nullable(),
    interests: z.array(z.string().trim().min(1).max(40)).max(20),
    tech_interests: z.array(z.string().trim().min(1).max(40)).max(20),
    excited_by: z.string().trim().max(200).nullable(),
    career_goal: z.string().trim().max(200).nullable(),
    visibility: profileVisibility,
    portfolio_public: z.boolean(),
    sex: sexChoice.nullable(),
    sex_public: z.boolean(),
    birth_year: z.number().int().min(1940).max(2030).nullable(),
    phone: phoneNumber.nullable(),
    phone_visibility: phoneVisibility,
  })
  .partial()
  .refine((body) => Object.keys(body).length > 0, "Send at least one field");

// PRF-02 PUT /api/v1/me/skills replaces the whole list.
export const skillLevel = z.number().int().min(1).max(5);
export const skillsPutBody = z
  .strictObject({
    skills: z
      .array(
        z.strictObject({
          skill_id: uuid,
          level: skillLevel,
          evidence_url: httpsUrl.optional(),
        }),
      )
      .max(50),
  })
  .refine(
    (body) => new Set(body.skills.map((skill) => skill.skill_id)).size === body.skills.length,
    "Each skill can appear once",
  );
export const mySkill = z.object({
  skill_id: uuid,
  name: z.string(),
  level: skillLevel,
  evidence_url: httpsUrl.nullable(),
});
export const skillsPutResponse = successEnvelope(z.object({ skills: z.array(mySkill) }));

// PRF-03 GET /api/v1/skills?q=
export const skillSearchQuery = z.strictObject({ q: z.string().trim().min(1).max(50) });
export const skillSearchResponse = successEnvelope(
  z.array(z.object({ id: uuid, name: z.string(), category: z.string().nullable() })),
);

// PRF-04 POST /api/v1/me/avatar/upload-url
export const avatarAllowedMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/avif",
  // No SVG: an SVG file can carry scripts.
] as const;

export const avatarMimeType = z.enum(avatarAllowedMimeTypes);
export type AvatarMimeType = z.infer<typeof avatarMimeType>;

export const AVATAR_MAX_BYTES = 2 * 1024 * 1024; // 2 MB

export const avatarUploadUrlBody = z.strictObject({
  file_name: z.string().min(1).max(255),
  content_type: avatarMimeType,
  file_size: z.number().int().min(1).max(AVATAR_MAX_BYTES),
});

export const avatarUploadUrlResponse = successEnvelope(
  z.object({
    upload_url: z.string().url(),
    path: z.string().min(1),
  }),
);

export const avatarUploadResponse = successEnvelope(
  z.object({
    avatar_url: z.string().url(),
  }),
);

// PRF-06 GET /api/v1/c/{slug}/people/{userId}: one classmate. No email address, ever.
export const personProfileResponse = successEnvelope(
  z.object({
    user_id: uuid,
    display_name: z.string(),
    handle: z.string().nullable(),
    headline: z.string().nullable(),
    bio: z.string().nullable(),
    avatar_url: z.string().nullable(),
    interests: z.array(z.string()),
    tech_interests: z.array(z.string()).default([]),
    excited_by: z.string().nullable().default(null),
    // Only when the person chose to show it (never "prefer not to say").
    gender: sexChoice.nullable().default(null),
    career_goal: z.string().nullable(),
    program: z.string().nullable(),
    grad_year: z.number().int().nullable(),
    skills: z.array(z.object({ name: z.string(), level: z.number().int().min(1).max(5) })),
    is_self: z.boolean(),
  }),
);
