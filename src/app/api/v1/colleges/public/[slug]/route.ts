import { slug as slugSchema } from "@/contracts";
import { ok, route } from "@/lib/api";
import { AppError } from "@/lib/errors";
import { createAnonClient } from "@/lib/supabase/request-client";

// TEN-01 GET /api/v1/colleges/public/{slug}
// Anyone may call it. It reads the public_college_branding view with the anon key, so the database
// decides what is public: active colleges, and only the branding columns.
// `modules` says which tabs (campus, collaborate, career) the college has on, for R3's navigation.
export const GET = route<{ slug: string }>(async ({ requestId, params }) => {
  const slug = slugSchema.safeParse(params.slug);
  if (!slug.success) throw new AppError("NOT_FOUND");
  const { data, error } = await createAnonClient()
    .from("public_college_branding")
    .select(
      "slug, name, short_name, city, state, accent_hex, allowed_methods, require_admin_approval, modules",
    )
    .eq("slug", slug.data)
    .maybeSingle();
  if (error) throw new AppError("UPSTREAM_UNAVAILABLE", { cause: error });
  if (!data) throw new AppError("NOT_FOUND");
  return ok({ ...data, logo_url: null }, requestId);
});
