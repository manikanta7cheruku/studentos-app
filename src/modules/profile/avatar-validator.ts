import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "@/lib/errors";
import { AVATAR_MAX_BYTES } from "@/contracts/profile";

/**
 * Inspects the initial magic bytes of a buffer to determine the real image MIME type.
 * Does not trust client-declared headers or file extensions.
 */
export function detectImageMime(buffer: Uint8Array): string | null {
  if (buffer.length < 4) return null;

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "image/png";
  }

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }

  // GIF: GIF87a or GIF89a (47 49 46 38 37/39 61)
  if (
    buffer.length >= 6 &&
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x38 &&
    (buffer[4] === 0x37 || buffer[4] === 0x39) &&
    buffer[5] === 0x61
  ) {
    return "image/gif";
  }

  // WebP: RIFF .... WEBP
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return "image/webp";
  }

  // AVIF: ....ftypavif or ftypavis
  if (buffer.length >= 12) {
    const ftyp = String.fromCharCode(buffer[4]!, buffer[5]!, buffer[6]!, buffer[7]!);
    const brand = String.fromCharCode(buffer[8]!, buffer[9]!, buffer[10]!, buffer[11]!);
    if (ftyp === "ftyp" && (brand === "avif" || brand === "avis")) {
      return "image/avif";
    }
  }

  return null;
}

/**
 * Validates real avatar file contents on the server.
 * Enforces size <= 2MB and genuine image magic bytes.
 */
export function validateAvatarBuffer(buffer: Uint8Array): { mimeType: string; size: number } {
  if (buffer.length === 0) {
    throw new AppError("VALIDATION_FAILED", {
      details: { fields: [{ path: "file", message: "Avatar file cannot be empty." }] },
    });
  }

  if (buffer.length > AVATAR_MAX_BYTES) {
    throw new AppError("PAYLOAD_TOO_LARGE", {
      message: `Avatar file exceeds maximum size of 2 MB (${buffer.length} bytes).`,
    });
  }

  const mimeType = detectImageMime(buffer);
  if (!mimeType) {
    throw new AppError("UNSUPPORTED_MEDIA_TYPE", {
      message:
        "The uploaded file is not a supported image. Only genuine image files (JPEG, PNG, WebP, GIF, AVIF) are allowed.",
    });
  }

  return { mimeType, size: buffer.length };
}

export function extensionForMime(mimeType: string): string {
  switch (mimeType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    case "image/avif":
      return "avif";
    default:
      return "img";
  }
}

/**
 * Validates content, uploads to storage, and records avatar_path in profiles table.
 */
export async function uploadAvatar(
  supabase: SupabaseClient,
  userId: string,
  buffer: Uint8Array,
): Promise<{ avatar_url: string }> {
  const { mimeType } = validateAvatarBuffer(buffer);
  const ext = extensionForMime(mimeType);
  // The folder is the user id, so the storage rule "only write in your own folder" can check it.
  const storagePath = `${userId}/${Date.now()}-avatar.${ext}`;

  // Upload to Supabase Storage bucket 'avatars' (the bucket also refuses files over 2 MB and non-image types).
  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(storagePath, buffer, { contentType: mimeType, upsert: false });
  if (uploadError) {
    // Never save a path to a file that does not exist.
    throw new AppError("UPSTREAM_UNAVAILABLE", { cause: uploadError });
  }
  const { data: pubData } = supabase.storage.from("avatars").getPublicUrl(storagePath);
  const avatarUrl = pubData.publicUrl;

  // Update profile avatar_path
  const { error: dbError } = await supabase
    .from("profiles")
    .update({ avatar_path: storagePath })
    .eq("user_id", userId);

  if (dbError) {
    throw new AppError("UPSTREAM_UNAVAILABLE", { cause: dbError });
  }

  return { avatar_url: avatarUrl };
}
