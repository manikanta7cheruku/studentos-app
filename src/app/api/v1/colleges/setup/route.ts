import { collegeSetupBody } from "@/contracts";
import { assertSameOrigin, ok, readJson, route } from "@/lib/api";
import { hashKey } from "@/lib/hash";
import { CookieJar, getCurrentUser } from "@/lib/supabase/request-client";
import { consumeOrThrow } from "@/modules/rate-limit/rate-limit.admin";
import { createCollegeWithCode } from "@/modules/tenancy/college-setup.admin";

// COL-01 POST /api/v1/colleges/setup   { "code": "12345678", "slug": "alpha", "name": "...", "domains": [..], "join_method": "email" }
// A signed-in person with a valid one-time setup code (from the platform owner) makes their own college and becomes
// its first admin. 403 FORBIDDEN for a wrong, used or expired code (the answer never says which). 409 CONFLICT when
// the address (slug) is taken. 429 RATE_LIMITED after 5 tries an hour. Rules: docs/AUTH_AND_TENANCY.md section 7.
export const POST = route(async ({ request, requestId }) => {
  assertSameOrigin(request);
  const jar = new CookieJar();
  const { user } = await getCurrentUser(request, jar);
  await consumeOrThrow("college_setup", hashKey("user", user.id), 5, 3600);
  const body = await readJson(request, collegeSetupBody);
  const made = await createCollegeWithCode(user.id, body);
  return jar.applyTo(ok(made, requestId, { status: 201 }));
});
