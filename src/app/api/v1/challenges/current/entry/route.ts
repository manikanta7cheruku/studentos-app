import { challengeEntryBody } from "@/contracts";
import { ok, readJson, route } from "@/lib/api";
import { meContext } from "@/modules/engagement/context";
import { submitChallenge } from "@/modules/social/social.admin";

// CHL-02 PUT /api/v1/challenges/current/entry   { "body": "..." }: my answer to this week's challenge, 1 to 300 characters.
// Answering again changes the answer (one answer per person a week). Needs an active membership, Global included.
export const PUT = route(async ({ request, requestId }) => {
  const { jar, userId } = await meContext(request, { write: true });
  const body = await readJson(request, challengeEntryBody);
  return jar.applyTo(ok(await submitChallenge(userId, body.body), requestId));
});
