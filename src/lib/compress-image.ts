/**
 * Shrinks a picture on the phone before it is uploaded: the long side becomes at most `maxEdge` pixels and the picture is
 * saved again as WebP (or JPEG where WebP cannot be written). That removes the camera's metadata (including the place the
 * photo was taken), and a normal photo drops from several MB to about 100 to 250 KB. If the result is still larger than
 * `maxBytes`, the quality and the size are lowered a step at a time.
 */
export async function compressImage(
  file: Blob,
  options: { maxEdge?: number; maxBytes?: number; quality?: number } = {},
): Promise<Blob> {
  const { maxBytes = 1_000_000 } = options;
  let edge = options.maxEdge ?? 1080;
  let quality = options.quality ?? 0.82;

  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) throw new Error("That file is not a picture we can open.");

  try {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const scale = Math.min(1, edge / Math.max(bitmap.width, bitmap.height));
      const width = Math.max(1, Math.round(bitmap.width * scale));
      const height = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("This browser cannot shrink pictures.");
      context.drawImage(bitmap, 0, 0, width, height);
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/webp", quality),
      );
      // Safari older than 14 cannot write WebP and hands back a PNG. Use JPEG then.
      const out =
        blob && blob.type === "image/webp"
          ? blob
          : await new Promise<Blob | null>((resolve) =>
              canvas.toBlob(resolve, "image/jpeg", quality),
            );
      if (out && out.size <= maxBytes) return out;
      edge = Math.round(edge * 0.8);
      quality = Math.max(0.5, quality - 0.1);
    }
  } finally {
    bitmap.close();
  }
  throw new Error("That picture is too large even after shrinking. Pick another one.");
}
