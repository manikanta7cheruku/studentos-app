import { ok, route } from "@/lib/api";
import { listMyMemberships } from "@/modules/account/account.admin";
import { meContext } from "@/modules/engagement/context";

// TEN-08 GET /api/v1/me/memberships: the colleges I belong to or asked to join (any status), newest first.
// Any signed-in person. It only ever returns the caller's own rows. The screens use it right after sign in.
export const GET = route(async ({ request, requestId }) => {
  const { jar, userId } = await meContext(request);
  return jar.applyTo(ok(await listMyMemberships(userId), requestId));
});
