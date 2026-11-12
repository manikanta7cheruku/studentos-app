import { createClient } from "@supabase/supabase-js";
import { api } from "@/lib/api/endpoints";
import { compressImage } from "@/lib/compress-image";

/**
 * Shrinks a picture and uploads it to the photo bucket with a one time link from the server. Returns the path to attach
 * to a post. The server only hands out a link for a picture of 1 MB or less, for a signed in member.
 */
export async function uploadPhoto(slug: string, file: Blob): Promise<string> {
  const blob = await compressImage(file);
  const target = await api.photos.uploadUrl(slug, {
    content_type: blob.type as "image/webp" | "image/jpeg",
    file_size: blob.size,
  });
  const token = new URL(target.upload_url).searchParams.get("token");
  if (!token) throw new Error("The upload link was not valid.");
  const storage = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    { auth: { persistSession: false, autoRefreshToken: false } },
  ).storage;
  const { error } = await storage
    .from("post-photos")
    .uploadToSignedUrl(target.path, token, blob, { contentType: blob.type });
  if (error) throw new Error("The picture could not be uploaded. Please try again.");
  return target.path;
}
