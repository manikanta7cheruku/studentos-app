import { referralBody } from "@/contracts";
import { ok, readJson, route } from "@/lib/api";
import { meContext } from "@/modules/engagement/context";
import { applyReferral } from "@/modules/social/social.admin";

// INV-02 POST /api/v1/me/referral   { "code": "..." }: I joined through someone's invite link. Counts once, never for
// yourself, and an unknown code is ignored (applied: false), so the answer never confirms which codes exist.
export const POST = route(async ({ request, requestId }) => {
  const { jar, userId } = await meContext(request, { write: true });
  const body = await readJson(request, referralBody);
  return jar.applyTo(ok(await applyReferral(userId, body.code), requestId));
});
