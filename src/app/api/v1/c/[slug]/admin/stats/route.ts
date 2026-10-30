import { ok, route } from "@/lib/api";
import { adminContext } from "@/modules/admin/context";
import { getStats } from "@/modules/admin/admin-api.admin";

// ADM-11 GET /api/v1/c/{slug}/admin/stats: counts for the dashboard (members, waiting requests, usable invites).
export const GET = route<{ slug: string }>(async ({ request, requestId, params }) => {
  const { jar, actorId, collegeId } = await adminContext(request, params.slug);
  return jar.applyTo(ok(await getStats(actorId, collegeId), requestId));
});
