import { connectionsQuery } from "@/contracts";
import { ok, readQuery, route } from "@/lib/api";
import { meContext } from "@/modules/engagement/context";
import { listConnections } from "@/modules/social/social.admin";

// FOL-02 GET /api/v1/me/connections?kind=followers|following: the people who follow me, or whom I follow.
// Only my own lists. Nobody else can see who follows whom, and other people's profiles show no follower counts.
export const GET = route(async ({ request, requestId }) => {
  const { jar, userId } = await meContext(request);
  const { kind } = readQuery(request, connectionsQuery);
  return jar.applyTo(ok(await listConnections(userId, kind), requestId));
});
