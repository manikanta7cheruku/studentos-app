import { collegeSuggestQuery } from "@/contracts";
import { ok, readQuery, route } from "@/lib/api";
import { meContext } from "@/modules/engagement/context";
import { suggestColleges } from "@/modules/social/social.admin";

// COL-02 GET /api/v1/colleges/suggest?q=: college names that already exist, to pick from while typing. Needs sign in.
export const GET = route(async ({ request, requestId }) => {
  const { jar } = await meContext(request);
  const { q } = readQuery(request, collegeSuggestQuery);
  return jar.applyTo(ok(await suggestColleges(q), requestId));
});
