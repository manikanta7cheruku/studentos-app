import { adminSettingsPatchBody } from "@/contracts";
import { ok, readJson, route } from "@/lib/api";
import { adminContext } from "@/modules/admin/context";
import { getSettings, updateSettings } from "@/modules/admin/admin-api.admin";

// ADM-03 GET /api/v1/c/{slug}/admin/settings: join methods, approval rule, level to post, module flags,
// plus a read only block with the college name, colours and domains (the platform manages those).
export const GET = route<{ slug: string }>(async ({ request, requestId, params }) => {
  const { jar, actorId, collegeId } = await adminContext(request, params.slug);
  return jar.applyTo(ok(await getSettings(actorId, collegeId), requestId));
});

// ADM-03 PATCH: send only what changes. Writes one audit row (settings.updated).
export const PATCH = route<{ slug: string }>(async ({ request, requestId, params }) => {
  const { jar, actorId, collegeId } = await adminContext(request, params.slug, { write: true });
  const patch = await readJson(request, adminSettingsPatchBody);
  return jar.applyTo(ok(await updateSettings(actorId, collegeId, patch, requestId), requestId));
});
