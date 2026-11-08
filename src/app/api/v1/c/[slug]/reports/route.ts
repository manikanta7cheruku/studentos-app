import { reportCreateBody } from "@/contracts";
import { ok, readJson, route } from "@/lib/api";
import { readIdempotencyKey, withIdempotency } from "@/lib/idempotency.admin";
import { memberContext } from "@/modules/engagement/context";
import { createReport } from "@/modules/engagement/engagement.admin";

// RPT-01 POST /api/v1/c/{slug}/reports (IDEM)
//   { "target_type": "announcement" | "profile", "target_id": "...", "reason": "spam", "details": "optional" }
// Any active member may report. The target must be in this college (404 if not), not yourself (400),
// and one open report per person and item (409). Team posts and projects can be reported from Day 5.
export const POST = route<{ slug: string }>(async ({ request, requestId, params }) => {
  const { jar, slug, actorId, collegeId } = await memberContext(request, params.slug, {
    write: true,
  });
  const body = await readJson(request, reportCreateBody);
  const key = readIdempotencyKey(request);
  const result = await withIdempotency(
    { userId: actorId, route: `POST reports ${slug}`, key, body },
    async () => ({ status: 201, data: await createReport(actorId, collegeId, body) }),
  );
  return jar.applyTo(
    ok(result.data, requestId, {
      status: result.status,
      headers: result.replay ? { "Idempotent-Replay": "true" } : undefined,
    }),
  );
});
