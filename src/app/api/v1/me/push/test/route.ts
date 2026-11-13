import { ok, route } from "@/lib/api";
import { meContext } from "@/modules/engagement/context";
import { sendTestAlert } from "@/modules/push/push.admin";

// PSH-03 POST /api/v1/me/push/test
// Sends one test alert to every device the person turned alerts on for. Answer { sent }: how many devices took it
// (0 when alerts are not set up on the server or the person has no device). Counts as a write, so it is rate limited.
export const POST = route(async ({ request, requestId }) => {
  const { jar, userId } = await meContext(request, { write: true });
  return jar.applyTo(ok({ sent: await sendTestAlert(userId) }, requestId));
});
