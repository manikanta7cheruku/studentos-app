import { memberListQuery } from "@/contracts";
import { ok, readQuery, route } from "@/lib/api";
import { decodeCursor } from "@/lib/cursor";
import { adminContext } from "@/modules/admin/context";
import { listMembers } from "@/modules/admin/admin-api.admin";

// ADM-08 GET /api/v1/c/{slug}/admin/members?q=riya&status=active&role=student&limit=20&cursor=...
// Everyone who ever joined this college (active, pending, suspended, rejected, left). Newest first.
// No email addresses here: the list shows name, role, status, level, method, program and year.
export const GET = route<{ slug: string }>(async ({ request, requestId, params }) => {
  const { jar, actorId, collegeId } = await adminContext(request, params.slug);
  const query = readQuery(request, memberListQuery);
  const { items, nextCursor } = await listMembers(actorId, collegeId, {
    q: query.q,
    status: query.status,
    role: query.role,
    limit: query.limit,
    cursor: decodeCursor(query.cursor),
  });
  return jar.applyTo(ok(items, requestId, { nextCursor }));
});
