import { ok, route } from "@/lib/api";
import { meContext } from "@/modules/engagement/context";
import { getInvite } from "@/modules/social/social.admin";

// INV-01 GET /api/v1/me/invite: my invite code (made the first time) and how many people joined with it.
export const GET = route(async ({ request, requestId }) => {
  const { jar, userId } = await meContext(request);
  return jar.applyTo(ok(await getInvite(userId), requestId));
});
