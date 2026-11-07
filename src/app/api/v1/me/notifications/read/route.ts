import { notificationReadBody } from "@/contracts";
import { ok, readJson, route } from "@/lib/api";
import { meContext } from "@/modules/engagement/context";
import { markNotificationsRead } from "@/modules/engagement/reads";

// NTF-02 POST /api/v1/me/notifications/read   { "ids": ["..."] }  or  { "all": true }
// Marks the person's OWN notifications read. An id that is not theirs changes nothing and is not counted.
export const POST = route(async ({ request, requestId }) => {
  const { jar, supabase } = await meContext(request, { write: true });
  const body = await readJson(request, notificationReadBody);
  const updated = await markNotificationsRead(supabase, body);
  return jar.applyTo(ok({ updated }, requestId));
});
