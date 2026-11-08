import { joinOpenBody, slug as slugSchema } from "@/contracts";
import { assertSameOrigin, ok, readJson, route } from "@/lib/api";
import { AppError } from "@/lib/errors";
import { hashKey } from "@/lib/hash";
import { readIdempotencyKey, withIdempotency } from "@/lib/idempotency.admin";
import { limitWrites } from "@/lib/write-limit";
import { CookieJar, getCurrentUser } from "@/lib/supabase/request-client";
import { consumeOrThrow } from "@/modules/rate-limit/rate-limit.admin";
import { submitOpenJoin } from "@/modules/tenancy/join.admin";

// TEN-09 POST /api/v1/c/{slug}/join/open (IDEM)
// Only the Global college allows this method (403 FORBIDDEN in any other college). The person is active at once at
// level 1, which means "signed in, not verified by any college".
export const POST = route<{ slug: string }>(async ({ request, requestId, params }) => {
  assertSameOrigin(request);
  const slug = slugSchema.safeParse(params.slug);
  if (!slug.success) throw new AppError("NOT_FOUND");
  const body = await readJson(request, joinOpenBody);
  const key = readIdempotencyKey(request);
  const jar = new CookieJar();
  const { user } = await getCurrentUser(request, jar);
  await limitWrites(user.id);

  const result = await withIdempotency(
    { userId: user.id, route: `POST join/open ${slug.data}`, key, body },
    async () => {
      await consumeOrThrow("join_open_user", hashKey("user", user.id), 10, 3600);
      const membership = await submitOpenJoin(user.id, slug.data, requestId);
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
