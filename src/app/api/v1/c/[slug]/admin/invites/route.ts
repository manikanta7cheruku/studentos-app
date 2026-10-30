import { inviteCreateBody } from "@/contracts";
import { ok, readJson, route } from "@/lib/api";
import { AppError, validationError } from "@/lib/errors";
import { readIdempotencyKey, withIdempotency } from "@/lib/idempotency.admin";
import { adminContext } from "@/modules/admin/context";
import { createInvite, listInvites } from "@/modules/admin/admin-api.admin";
import { generateInviteCode } from "@/modules/admin/invite-code";
import { hashInviteCode } from "@/modules/tenancy/join.admin";

// ADM-05 GET /api/v1/c/{slug}/admin/invites: the 100 newest invites with their state
// (active, exhausted, expired, revoked). The code itself is never stored, so it is never listed.
export const GET = route<{ slug: string }>(async ({ request, requestId, params }) => {
  const { jar, actorId, collegeId } = await adminContext(request, params.slug);
  return jar.applyTo(ok(await listInvites(actorId, collegeId), requestId));
});

const MAX_DAYS = 365;

// ADM-05 POST (IDEM): create an invite. The answer holds the plain code ONCE. Writes one audit row (invite.created).
export const POST = route<{ slug: string }>(async ({ request, requestId, params }) => {
  const { jar, slug, actorId, collegeId } = await adminContext(request, params.slug, {
    write: true,
  });
  const body = await readJson(request, inviteCreateBody);
  const key = readIdempotencyKey(request);

  const expires = Date.parse(body.expires_at);
  if (expires <= Date.now()) {
    throw validationError([{ path: "expires_at", message: "The end date must be in the future." }]);
  }
  if (expires > Date.now() + MAX_DAYS * 24 * 3600 * 1000) {
    throw validationError([
      { path: "expires_at", message: `An invite can last at most ${MAX_DAYS} days.` },
    ]);
  }

  const result = await withIdempotency(
    { userId: actorId, route: `POST admin/invites ${slug}`, key, body },
    async () => {
      for (let attempt = 0; ; attempt++) {
        const code = generateInviteCode(slug);
        try {
          const invite = await createInvite(
            actorId,
            collegeId,
            {
              codeHash: hashInviteCode(code),
              label: body.label,
              maxUses: body.max_uses,
              expiresAt: new Date(expires).toISOString(),
              grantsStatus: body.grants_status,
            },
            requestId,
          );
          return { status: 201, data: { invite, code } };
        } catch (error) {
          // Two random codes colliding is practically impossible, but one more try is cheap.
          if (attempt === 0 && error instanceof AppError && error.code === "CONFLICT") continue;
          throw error;
        }
      }
    },
    // The plain code is never stored. A replay returns the invite with code: null.
    { keep: (data) => ({ invite: (data as { invite: unknown }).invite, code: null }) },
  );
  return jar.applyTo(
    ok(result.data, requestId, {
      status: result.status,
      headers: result.replay ? { "Idempotent-Replay": "true" } : undefined,
    }),
  );
});
