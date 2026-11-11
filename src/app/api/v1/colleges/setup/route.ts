import { createHash } from "node:crypto";
import { collegeSetupBody } from "@/contracts";
import { assertSameOrigin, ok, readJson, route } from "@/lib/api";
import { mapDbError } from "@/lib/db-error";
import { hashKey } from "@/lib/hash";
import { CookieJar, getCurrentUser } from "@/lib/supabase/request-client";
import { consumeOrThrow } from "@/modules/rate-limit/rate-limit.admin";
import { adminClient } from "@/server/admin/supabase-admin";

// COL-01 POST /api/v1/colleges/setup   { "code": "12345678", "slug": "alpha", "name": "...", "domains": [..], "join_method": "email" }
// A signed-in person with a valid one-time setup code (from the platform owner) makes their own college and becomes
// its first admin. 403 FORBIDDEN for a wrong, used or expired code (the answer never says which). 409 CONFLICT when
// the address (slug) is taken. 429 RATE_LIMITED after 5 tries an hour. Rules: docs/AUTH_AND_TENANCY.md section 7.
const METHODS = {
  email: { methods: ["email_domain"], approval: false },
  invite: { methods: ["invite_code"], approval: false },
  approval: { methods: ["manual", "email_domain"], approval: true },
} as const;

export const POST = route(async ({ request, requestId }) => {
  assertSameOrigin(request);
  const jar = new CookieJar();
  const { user } = await getCurrentUser(request, jar);
  await consumeOrThrow("college_setup", hashKey("user", user.id), 5, 3600);
  const body = await readJson(request, collegeSetupBody);
  const choice = METHODS[body.join_method];
  const { data, error } = await adminClient().rpc("college_setup_create", {
    p_actor: user.id,
    p_code_hash: createHash("sha256").update(body.code, "utf8").digest("hex"),
    p_slug: body.slug,
    p_name: body.name,
    p_short: body.short_name ?? "",
    p_city: body.city,
    p_state: body.state,
    p_domains: body.domains,
    p_methods: choice.methods,
    p_require_approval: choice.approval,
  });
  if (error) throw mapDbError(error);
  return jar.applyTo(ok(data, requestId, { status: 201 }));
});
