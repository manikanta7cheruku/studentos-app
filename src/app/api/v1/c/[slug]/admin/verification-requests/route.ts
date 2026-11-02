import { verificationRequestQuery } from "@/contracts";
import { ok, readQuery, route } from "@/lib/api";
import { decodeCursor } from "@/lib/cursor";
import { adminContext } from "@/modules/admin/context";
import { listVerificationRequests } from "@/modules/admin/admin-api.admin";

// ADM-06 GET /api/v1/c/{slug}/admin/verification-requests?status=pending&limit=20&cursor=...
// People waiting for an admin (manual requests, and invite codes that only grant "pending"). Newest first.
export const GET = route<{ slug: string }>(async ({ request, requestId, params }) => {
  const { jar, actorId, collegeId } = await adminContext(request, params.slug);
  const query = readQuery(request, verificationRequestQuery);
  const { items, nextCursor } = await listVerificationRequests(actorId, collegeId, {
    status: query.status,
    limit: query.limit,
    cursor: decodeCursor(query.cursor),
  });
  return jar.applyTo(ok(items, requestId, { nextCursor }));
});
