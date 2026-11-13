import { ok, route } from "@/lib/api";
import { memberContext } from "@/modules/engagement/context";
import { connectionList } from "@/modules/network/network.admin";

// NET-03 GET /api/v1/c/{slug}/network/connections: the people I am connected to in this space.
export const GET = route<{ slug: string }>(async ({ request, requestId, params }) => {
  const { jar, actorId, collegeId } = await memberContext(request, params.slug);
  return jar.applyTo(ok(await connectionList(actorId, collegeId), requestId));
});
