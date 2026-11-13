import { ok, route } from "@/lib/api";
import { meContext } from "@/modules/engagement/context";
import { currentChallenge } from "@/modules/social/social.admin";

// CHL-01 GET /api/v1/challenges/current: this week's challenge, the answers (most applauded first) and my own answer.
// The same challenge for everybody. People I blocked, or who blocked me, are left out.
export const GET = route(async ({ request, requestId }) => {
  const { jar, userId } = await meContext(request);
  return jar.applyTo(ok(await currentChallenge(userId), requestId));
});
