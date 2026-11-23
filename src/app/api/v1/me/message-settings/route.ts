import { messageSettingsBody } from "@/contracts";
import { ok, readJson, route } from "@/lib/api";
import { meContext } from "@/modules/engagement/context";
import { getMessageSettings, setMessageSettings } from "@/modules/messages/messages.admin";

// MSG-07 GET /api/v1/me/message-settings: what my new conversations start with (1 hour unless I changed it).
export const GET = route(async ({ request, requestId }) => {
  const { jar, userId } = await meContext(request);
  return jar.applyTo(ok(await getMessageSettings(userId), requestId));
});

// MSG-08 PUT /api/v1/me/message-settings   { "default_minutes": 60 | 420 | 1440 }
// Changes the default for conversations I start from now on. Existing conversations keep their own timer.
export const PUT = route(async ({ request, requestId }) => {
  const { jar, userId } = await meContext(request, { write: true });
  const body = await readJson(request, messageSettingsBody);
  return jar.applyTo(ok(await setMessageSettings(userId, body.default_minutes), requestId));
});
