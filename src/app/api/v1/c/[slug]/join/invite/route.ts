import { joinInviteBody, slug as slugSchema } from "@/contracts";
import { assertSameOrigin, ok, readJson, route } from "@/lib/api";
import { AppError } from "@/lib/errors";
import { hashKey } from "@/lib/hash";
import { readIdempotencyKey, withIdempotency } from "@/lib/idempotency.admin";
import { limitWrites } from "@/lib/write-limit";
import { CookieJar, getCurrentUser } from "@/lib/supabase/request-client";
import { consumeOrThrow } from "@/modules/rate-limit/rate-limit.admin";
import { redeemInvite } from "@/modules/tenancy/join.admin";

// TEN-03 POST /api/v1/c/{slug}/join/invite (IDEM)
export const POST = route<{ slug: string }>(async ({ request, requestId, params }) => {
  assertSameOrigin(request);
  const slug = slugSchema.safeParse(params.slug);
  if (!slug.success) throw new AppError("NOT_FOUND");
  const body = await readJson(request, joinInviteBody);
  const key = readIdempotencyKey(request);
  const jar = new CookieJar();
  const { user } = await getCurrentUser(request, jar);
  await limitWrites(user.id);

  const result = await withIdempotency(
    { userId: user.id, route: `POST join/invite ${slug.data}`, key, body },
    async () => {
      // Brute force guard: 10 tries per hour per person (docs/API_CONTRACT.md TEN-03).
      await consumeOrThrow("invite_redeem_user", hashKey("user", user.id), 10, 3600);
      const membership = await redeemInvite(user.id, slug.data, body.code, requestId);
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
