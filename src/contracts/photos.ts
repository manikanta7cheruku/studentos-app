import { z } from "zod";
import { successEnvelope } from "./common";
import { boardItem } from "./board";

// Photos on market and lost and found posts (PHO-01, BRD-08). Rules: docs/API_CONTRACT.md section 19.
// The phone shrinks the picture first (about 1080 pixels wide, WebP, usually 100 to 250 KB). 1 MB at most.
export const PHOTO_MAX_BYTES = 1_048_576;
export const photoMimeType = z.enum(["image/webp", "image/jpeg", "image/png"]);

// PHO-01 POST /api/v1/c/{slug}/photos/upload-url: a link the phone uploads the picture to, and the path to attach.
export const photoUploadUrlBody = z.strictObject({
  content_type: photoMimeType,
  file_size: z.number().int().min(1).max(PHOTO_MAX_BYTES),
});
export const photoUploadUrlResponse = successEnvelope(
  z.object({ upload_url: z.string().url(), path: z.string().min(1), max_bytes: z.number().int() }),
);

// BRD-08 PUT /api/v1/c/{slug}/board/{id}/photo   { "path": "<from PHO-01>" | null }  (only the author)
export const boardPhotoBody = z.strictObject({ path: z.string().min(1).max(200).nullable() });
export const boardPhotoResponse = successEnvelope(boardItem);
