import { announcementPatchBody } from "@/contracts";
import { ok, readJson, route } from "@/lib/api";
import { pathUuid } from "@/modules/admin/context";
import { modContext } from "@/modules/engagement/context";
import { updateAnnouncement } from "@/modules/engagement/engagement.admin";

// ANN-02 PATCH /api/v1/c/{slug}/admin/announcements/{id}: change an announcement (send only what changes).
// 404 if it is not in this college. 409 if it was already removed. Writes one audit row (announcement.updated).
export const PATCH = route<{ slug: string; id: string }>(async ({ request, requestId, params }) => {
  const { jar, actorId, collegeId } = await modContext(request, params.slug, { write: true });
  const patch = await readJson(request, announcementPatchBody);
  const announcement = await updateAnnouncement(
    actorId,
    collegeId,
    pathUuid(params.id),
    patch,
    requestId,
  );
  return jar.applyTo(ok(announcement, requestId));
});

// ANN-02 DELETE: remove an announcement. The row stays (status "removed") so the audit trail is complete.
// Writes one audit row (announcement.removed).
export const DELETE = route<{ slug: string; id: string }>(
  async ({ request, requestId, params }) => {
    const { jar, actorId, collegeId } = await modContext(request, params.slug, { write: true });
    const announcement = await updateAnnouncement(
      actorId,
      collegeId,
      pathUuid(params.id),
      { status: "removed" },
      requestId,
    );
    return jar.applyTo(ok(announcement, requestId));
  },
);
