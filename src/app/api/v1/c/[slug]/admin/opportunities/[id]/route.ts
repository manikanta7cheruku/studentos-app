import { opportunityPatchBody } from "@/contracts";
import { ok, readJson, route } from "@/lib/api";
import { pathUuid } from "@/modules/admin/context";
import { modContext } from "@/modules/engagement/context";
import { removeOpportunity, updateOpportunity } from "@/modules/opportunities/opportunities.admin";

// OPP-03 PATCH /api/v1/c/{slug}/admin/opportunities/{id}
// Send only what changes. `verified: true` moves last_verified_at to now. status draft or published.
// 409 if removed. People who saved the listing see a "changed" badge. Audit row: opportunity.updated.
export const PATCH = route<{ slug: string; id: string }>(async ({ request, requestId, params }) => {
  const { jar, actorId, collegeId } = await modContext(request, params.slug, { write: true });
  const patch = await readJson(request, opportunityPatchBody);
  const item = await updateOpportunity(actorId, collegeId, pathUuid(params.id), patch, requestId);
  return jar.applyTo(ok(item, requestId));
});

// OPP-03 DELETE /api/v1/c/{slug}/admin/opportunities/{id}
// Sets status removed (the row stays for the audit trail). 409 if already removed. Audit row: opportunity.removed.
export const DELETE = route<{ slug: string; id: string }>(
  async ({ request, requestId, params }) => {
    const { jar, actorId, collegeId } = await modContext(request, params.slug, { write: true });
    const result = await removeOpportunity(actorId, collegeId, pathUuid(params.id), requestId);
    return jar.applyTo(ok(result, requestId));
  },
);
