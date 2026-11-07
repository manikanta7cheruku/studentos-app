import { waitlistBody } from "@/contracts";
import { assertSameOrigin, clientIp, ok, readJson, route } from "@/lib/api";
import { hashKey } from "@/lib/hash";
import { joinWaitlist } from "@/modules/engagement/engagement.admin";
import { consumeOrThrow } from "@/modules/rate-limit/rate-limit.admin";

// WL-01 POST /api/v1/waitlist (public, used by the landing page)
// { college_name, contact_name, contact_email, role, consent: true, source? }
// The answer is always { joined: true }, also when the address is already on the list: the same email twice never
// makes a second row, and the answer never shows who is on the list (this is the idempotency of this endpoint,
// so no Idempotency-Key header is needed). 5 sign ups an hour per IP address.
export const POST = route(async ({ request, requestId }) => {
  assertSameOrigin(request);
  const body = await readJson(request, waitlistBody);
  await consumeOrThrow("waitlist_ip", hashKey("ip", clientIp(request)), 5, 3600);
  await joinWaitlist(body);
  return ok({ joined: true }, requestId);
});
