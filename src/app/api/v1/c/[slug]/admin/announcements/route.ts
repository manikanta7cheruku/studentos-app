import { announcementCreateBody, paginationQuery } from "@/contracts";
import { ok, readJson, readQuery, route } from "@/lib/api";
import { decodeCursor } from "@/lib/cursor";
import { readIdempotencyKey, withIdempotency } from "@/lib/idempotency.admin";
import { modContext } from "@/modules/engagement/context";
import {
  createAnnouncement,
  listAnnouncementsForModerators,
} from "@/modules/engagement/engagement.admin";

// ANN-02 GET /api/v1/c/{slug}/admin/announcements: every announcement of the college, drafts and removed ones too.
// For moderators and admins. Newest first.
export const GET = route<{ slug: string }>(async ({ request, requestId, params }) => {
  const { jar, actorId, collegeId } = await modContext(request, params.slug);
  const query = readQuery(request, paginationQuery);
  const { items, nextCursor } = await listAnnouncementsForModerators(actorId, collegeId, {
    limit: query.limit,
    cursor: decodeCursor(query.cursor),
  });
  return jar.applyTo(ok(items, requestId, { nextCursor }));
});

// ANN-02 POST (IDEM): publish an announcement. Members are told at once (unless publish_at is in the future).
// Writes one audit row (announcement.created).
export const POST = route<{ slug: string }>(async ({ request, requestId, params }) => {
  const { jar, slug, actorId, collegeId } = await modContext(request, params.slug, { write: true });
  const body = await readJson(request, announcementCreateBody);
  const key = readIdempotencyKey(request);
  const result = await withIdempotency(
    { userId: actorId, route: `POST admin/announcements ${slug}`, key, body },
    async () => ({
      status: 201,
      data: await createAnnouncement(actorId, collegeId, body, requestId),
    }),
  );
  return jar.applyTo(
    ok(result.data, requestId, {
      status: result.status,
      headers: result.replay ? { "Idempotent-Replay": "true" } : undefined,
    }),
  );
});
