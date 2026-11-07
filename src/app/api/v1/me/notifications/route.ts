import { notificationListQuery } from "@/contracts";
import { readQuery, route } from "@/lib/api";
import { decodeCursor } from "@/lib/cursor";
import { meContext } from "@/modules/engagement/context";
import { listMyNotifications } from "@/modules/engagement/reads";

// NTF-01 GET /api/v1/me/notifications?unread=true&limit=20&cursor=...
// The person's own notifications, newest first. meta.unread_count counts ALL unread ones, not only this page.
// Each item has payload.title and payload.message (plain text) and ids such as announcement_id or college_slug.
export const GET = route(async ({ request, requestId }) => {
  const { jar, supabase } = await meContext(request);
  const query = readQuery(request, notificationListQuery);
  const { items, nextCursor, unreadCount } = await listMyNotifications(supabase, {
    unread: query.unread === "true",
    limit: query.limit,
    cursor: decodeCursor(query.cursor),
  });
  const body = {
    data: items,
    meta: { request_id: requestId, next_cursor: nextCursor, unread_count: unreadCount },
  };
  return jar.applyTo(
    Response.json(body, { headers: { "Cache-Control": "no-store", "X-Request-Id": requestId } }),
  );
});
