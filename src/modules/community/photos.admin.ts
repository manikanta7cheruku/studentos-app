import { randomUUID } from "node:crypto";
import { adminClient } from "@/server/admin/supabase-admin";
import { toIso } from "@/lib/api";
import { AppError } from "@/lib/errors";
import { mapDbError } from "@/lib/db-error";

// Photos on market and lost and found posts (migration 20261124000000). The file lives in the public `post-photos` bucket under
// the author's own folder; the database keeps only the path.

export const PHOTO_BUCKET = "post-photos";

/** The public address of a stored picture, or null. */
export function photoUrl(path: string | null | undefined): string | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!path || !base) return null;
  return `${base.replace(/\/$/, "")}/storage/v1/object/public/${PHOTO_BUCKET}/${path}`;
}

const EXTENSION: Record<string, string> = {
  "image/webp": "webp",
  "image/jpeg": "jpg",
  "image/png": "png",
};

/** A one time link the phone uploads the shrunk picture to. The path starts with the person's id. */
export async function createPhotoUploadUrl(actor: string, input: { content_type: string }) {
  const path = `${actor}/${randomUUID()}.${EXTENSION[input.content_type] ?? "webp"}`;
  const { data, error } = await adminClient()
    .storage.from(PHOTO_BUCKET)
    .createSignedUploadUrl(path);
  if (error || !data) throw new AppError("UPSTREAM_UNAVAILABLE", { cause: error });
  return { upload_url: data.signedUrl, path, max_bytes: 1_048_576 };
}

/** The author attaches (or removes, with null) the photo of a post. */
export async function setBoardPhoto(
  actor: string,
  college: string,
  post: string,
  path: string | null,
) {
  const { data, error } = await adminClient().rpc("board_set_photo", {
    p_actor: actor,
    p_college: college,
    p_post: post,
    p_path: path,
  });
  if (error) throw mapDbError(error);
  const item = data as Record<string, unknown>;
  const { photo_path, ...rest } = item as Record<string, unknown> & { photo_path?: string | null };
  return {
    ...rest,
    created_at: toIso(item.created_at as string),
    photo_url: photoUrl(photo_path ?? null),
  };
}
