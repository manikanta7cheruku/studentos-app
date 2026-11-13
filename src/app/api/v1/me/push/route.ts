import { pushSubscribeBody, pushUnsubscribeBody } from "@/contracts";
import { ok, readJson, route } from "@/lib/api";
import { meContext } from "@/modules/engagement/context";
import { removePushSubscription, savePushSubscription } from "@/modules/push/push.admin";

// PSH-01 POST /api/v1/me/push   { endpoint, keys: { p256dh, auth } }
// This device now gets alerts. The same device sent twice is stored once. A person keeps at most 5 devices.
export const POST = route(async ({ request, requestId }) => {
  const { jar, userId } = await meContext(request, { write: true });
  const body = await readJson(request, pushSubscribeBody);
  await savePushSubscription(userId, body, request.headers.get("user-agent"));
  return jar.applyTo(ok({ enabled: true }, requestId));
});

// PSH-02 DELETE /api/v1/me/push   { endpoint }
// This device stops getting alerts. A device that was not stored is not an error.
export const DELETE = route(async ({ request, requestId }) => {
  const { jar, userId } = await meContext(request, { write: true });
  const body = await readJson(request, pushUnsubscribeBody);
  await removePushSubscription(userId, body.endpoint);
  return jar.applyTo(ok({ enabled: false }, requestId));
});
