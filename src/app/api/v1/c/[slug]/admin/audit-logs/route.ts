import { auditLogQuery } from "@/contracts";
import { ok, readQuery, route } from "@/lib/api";
import { decodeCursor } from "@/lib/cursor";
import { adminContext } from "@/modules/admin/context";
import { listAuditLogs } from "@/modules/admin/admin-api.admin";

// ADM-10 GET /api/v1/c/{slug}/admin/audit-logs?action=member.approved&actor_id=...&limit=20&cursor=...
// Who did what in this college, newest first. Read only: nobody can change or delete an audit row.
// `id` is a string because it is a 64 bit number. Metadata holds ids and short facts, never secrets.
export const GET = route<{ slug: string }>(async ({ request, requestId, params }) => {
  const { jar, actorId, collegeId } = await adminContext(request, params.slug);
  const query = readQuery(request, auditLogQuery);
  const { items, nextCursor } = await listAuditLogs(actorId, collegeId, {
    action: query.action,
    actorId: query.actor_id,
    limit: query.limit,
    cursor: decodeCursor(query.cursor),
  });
  return jar.applyTo(ok(items, requestId, { nextCursor }));
});
