import { networkSuggestionsQuery } from "@/contracts";
import { ok, readQuery, route } from "@/lib/api";
import { memberContext } from "@/modules/engagement/context";
import { suggestPeople } from "@/modules/network/network.admin";

// NET-01 GET /api/v1/c/{slug}/network/suggestions?limit=6: people to meet in this space. Not connected yet, no open request, not
// blocked. The ones who share the most with me come first. The order changes a little each day.
export const GET = route<{ slug: string }>(async ({ request, requestId, params }) => {
  const { jar, actorId, collegeId } = await memberContext(request, params.slug);
  const { limit } = readQuery(request, networkSuggestionsQuery);
  return jar.applyTo(ok(await suggestPeople(actorId, collegeId, limit), requestId));
});
