import { z } from "zod";
import { httpsUrl, isoDateTime, successEnvelope, uuid } from "./common";

// PRF-01 GET / PATCH /api/v1/me/profile
export const profileVisibility = z.enum(["college", "hidden"]);

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
  interests: z.array(z.string().min(1).max(40)).max(20),
  career_goal: z.string().max(200).nullable(),
  visibility: profileVisibility,
  portfolio_public: z.boolean(),
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
    career_goal: z.string().trim().max(200).nullable(),
    visibility: profileVisibility,
    portfolio_public: z.boolean(),
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
