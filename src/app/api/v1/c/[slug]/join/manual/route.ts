import { joinManualBody, slug as slugSchema } from "@/contracts";
import { assertSameOrigin, ok, readJson, route } from "@/lib/api";
import { AppError } from "@/lib/errors";
import { hashKey } from "@/lib/hash";
import { readIdempotencyKey, withIdempotency } from "@/lib/idempotency.admin";
import { CookieJar, getCurrentUser } from "@/lib/supabase/request-client";
import { consumeOrThrow } from "@/modules/rate-limit/rate-limit.admin";
import { submitManualJoin } from "@/modules/tenancy/join.admin";

// TEN-04 POST /api/v1/c/{slug}/join/manual (IDEM)
// The enrolment number is hashed before it is stored. Only the last 4 characters stay readable.
// The person is pending until a college admin decides (ADM-07).
export const POST = route<{ slug: string }>(async ({ request, requestId, params }) => {
  assertSameOrigin(request);
  const slug = slugSchema.safeParse(params.slug);
  if (!slug.success) throw new AppError("NOT_FOUND");
  const body = await readJson(request, joinManualBody);
  const key = readIdempotencyKey(request);
  const jar = new CookieJar();
  const { user } = await getCurrentUser(request, jar);

  const result = await withIdempotency(
    { userId: user.id, route: `POST join/manual ${slug.data}`, key, body },
    async () => {
      await consumeOrThrow("join_manual_user", hashKey("user", user.id), 10, 3600);
      const membership = await submitManualJoin(user.id, slug.data, body, requestId);
      return { status: 200, data: { membership } };
    },
  );
  return jar.applyTo(
    ok(result.data, requestId, {
      status: result.status,
      headers: result.replay ? { "Idempotent-Replay": "true" } : undefined,
    }),
  );
});
