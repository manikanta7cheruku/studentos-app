import { ok, route } from "@/lib/api";
import { meContext } from "@/modules/engagement/context";
import { myNetwork } from "@/modules/network/network.admin";

// NET-02 GET /api/v1/me/network: my connections (a chat the other person accepted, or a mutual follow) and my open requests.
export const GET = route(async ({ request, requestId }) => {
  const { jar, userId } = await meContext(request);
  return jar.applyTo(ok(await myNetwork(userId), requestId));
});
