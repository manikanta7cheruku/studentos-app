import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { detectImageMime, validateAvatarBuffer, uploadAvatar } from "../avatar-validator";
import { AVATAR_MAX_BYTES } from "@/contracts/profile";

describe("avatar upload validation (server-side magic bytes and size)", () => {
  // Sample valid magic byte buffers
  const validPng = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
  const validJpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
  const validGif = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00]);
  const validWebp = new Uint8Array([
    0x52,
    0x49,
    0x46,
    0x46, // "RIFF"
    0x1c,
    0x00,
    0x00,
    0x00, // file length
    0x57,
    0x45,
    0x42,
    0x50, // "WEBP"
    0x56,
    0x50,
    0x38,
    0x20, // "VP8 "
  ]);
  const validSvg = new TextEncoder().encode(
    '<svg xmlns="http://www.w3.org/2000/svg"><circle r="10"/></svg>',
  );

  describe("detectImageMime", () => {
    it("identifies genuine PNG files", () => {
      expect(detectImageMime(validPng)).toBe("image/png");
    });

    it("identifies genuine JPEG files", () => {
      expect(detectImageMime(validJpeg)).toBe("image/jpeg");
    });

    it("identifies genuine GIF files", () => {
      expect(detectImageMime(validGif)).toBe("image/gif");
    });

    it("identifies genuine WebP files", () => {
      expect(detectImageMime(validWebp)).toBe("image/webp");
    });

    it("identifies genuine SVG files", () => {
      expect(detectImageMime(validSvg)).toBe("image/svg+xml");
    });

    it("returns null for non-images", () => {
      const pdf = new TextEncoder().encode("%PDF-1.4 file content");
      const exe = new Uint8Array([0x4d, 0x5a, 0x90, 0x00]); // "MZ"
      const shellScript = new TextEncoder().encode("#!/bin/sh\necho hacked");

      expect(detectImageMime(pdf)).toBeNull();
      expect(detectImageMime(exe)).toBeNull();
      expect(detectImageMime(shellScript)).toBeNull();
    });

    it("rejects malicious SVGs containing scripts", () => {
      const badSvg = new TextEncoder().encode('<svg><script>alert("xss")</script></svg>');
      expect(detectImageMime(badSvg)).toBeNull();
    });
  });

  describe("validateAvatarBuffer", () => {
    it("rejects empty buffers with VALIDATION_FAILED (400)", () => {
      expect(() => validateAvatarBuffer(new Uint8Array([]))).toThrowError(
        expect.objectContaining({ code: "VALIDATION_FAILED" }),
      );
    });

    it("rejects oversized images (> 2 MB) with PAYLOAD_TOO_LARGE (413)", () => {
      const oversized = new Uint8Array(AVATAR_MAX_BYTES + 1);
      // Even if it starts with valid PNG magic bytes
      oversized.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);

      expect(() => validateAvatarBuffer(oversized)).toThrowError(
        expect.objectContaining({ code: "PAYLOAD_TOO_LARGE" }),
      );
    });

    it("rejects non-image types (e.g. PDF) with UNSUPPORTED_MEDIA_TYPE (415)", () => {
      const pdf = new TextEncoder().encode("%PDF-1.5 fake document content");
      expect(() => validateAvatarBuffer(pdf)).toThrowError(
        expect.objectContaining({ code: "UNSUPPORTED_MEDIA_TYPE" }),
      );
    });

    it("rejects spoofed extension files where content is text", () => {
      const textSpoofedAsImage = new TextEncoder().encode("Not really a JPEG file");
      expect(() => validateAvatarBuffer(textSpoofedAsImage)).toThrowError(
        expect.objectContaining({ code: "UNSUPPORTED_MEDIA_TYPE" }),
      );
    });

    it("accepts valid image buffers", () => {
      const result = validateAvatarBuffer(validPng);
      expect(result.mimeType).toBe("image/png");
      expect(result.size).toBe(validPng.length);
    });
  });

  describe("uploadAvatar", () => {
    it("uploads valid image and updates profile avatar_path", async () => {
      const mockUserId = "aaaaaaaa-1000-4000-8000-000000000003";
      const mockSupabase = {
        storage: {
          from: vi.fn().mockReturnValue({
            upload: vi.fn().mockResolvedValue({ error: null }),
            getPublicUrl: vi.fn().mockReturnValue({
              data: { publicUrl: `https://example.com/avatars/${mockUserId}/avatar.png` },
            }),
          }),
        },
        from: vi.fn().mockReturnValue({
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        }),
      } as unknown as SupabaseClient;

      const res = await uploadAvatar(mockSupabase, mockUserId, validPng);
      expect(res.avatar_url).toContain("avatar.png");
      expect(mockSupabase.storage.from).toHaveBeenCalledWith("avatars");
      expect(mockSupabase.from).toHaveBeenCalledWith("profiles");
    });
  });
});
