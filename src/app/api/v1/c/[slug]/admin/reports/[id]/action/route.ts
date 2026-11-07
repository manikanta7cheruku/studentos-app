import { reportActionBody } from "@/contracts";
import { ok, readJson, route } from "@/lib/api";
import { readIdempotencyKey, withIdempotency } from "@/lib/idempotency.admin";
import { pathUuid } from "@/modules/admin/context";
import { modContext } from "@/modules/engagement/context";
import { actOnReport } from "@/modules/engagement/engagement.admin";

// RPT-03 POST /api/v1/c/{slug}/admin/reports/{id}/action (IDEM)
//   { "action": "dismiss" }                          no note needed
//   { "action": "hide" | "warn" | "suspend", "note": "5 or more characters" }
// hide: the content disappears from lists. warn: the owner gets a notification with the note.
// suspend: the owner is suspended (a moderator can suspend students, an admin can also suspend moderators,
// nobody suspends an admin this way). The reporter is told the report was reviewed.
// 409 if it was already handled. 403 for a report about yourself. 404 if it is not in this college.
// Writes one audit row and one moderation action row.
export const POST = route<{ slug: string; id: string }>(async ({ request, requestId, params }) => {
  const { jar, slug, actorId, collegeId } = await modContext(request, params.slug, { write: true });
  const id = pathUuid(params.id);
  const body = await readJson(request, reportActionBody);
  const key = readIdempotencyKey(request);
  const result = await withIdempotency(
    { userId: actorId, route: `POST admin/report-action ${slug} ${id}`, key, body },
    async () => ({ status: 200, data: await actOnReport(actorId, collegeId, id, body, requestId) }),
  );
  return jar.applyTo(
    ok(result.data, requestId, {
      status: result.status,
      headers: result.replay ? { "Idempotent-Replay": "true" } : undefined,
    }),
  );
});
