import { slug as slugSchema } from "@/contracts";
import { AppError } from "@/lib/errors";
import { ok, route, toIso } from "@/lib/api";
import { CookieJar, getCurrentUser } from "@/lib/supabase/request-client";
import { loadMembership } from "@/modules/tenancy/require-member";

// TEN-02 GET /api/v1/c/{slug}/me/membership
// Any signed-in user may ask. `membership` is null when they have not joined this college.
export const GET = route<{ slug: string }>(async ({ request, requestId, params }) => {
  const slug = slugSchema.safeParse(params.slug);
  if (!slug.success) throw new AppError("NOT_FOUND");
  const jar = new CookieJar();
  const { supabase } = await getCurrentUser(request, jar);
  const row = await loadMembership(supabase, slug.data);
  const membership = row
    ? {
        id: row.membership_id,
        role: row.role,
        status: row.status,
        verification_level: row.verification_level,
        verification_method: row.verification_method,
        program: row.program,
        grad_year: row.grad_year,
        joined_at: toIso(row.joined_at),
        status_reason: row.status_reason,
      }
    : null;
  return jar.applyTo(ok({ membership }, requestId));
});
