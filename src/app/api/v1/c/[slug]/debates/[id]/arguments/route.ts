import { debateArgumentCreateBody } from "@/contracts";
import { ok, readJson, route } from "@/lib/api";
import { readIdempotencyKey, withIdempotency } from "@/lib/idempotency.admin";
import { pathUuid } from "@/modules/admin/context";
import { memberContext } from "@/modules/engagement/context";
import { createArgument, listArguments } from "@/modules/debates/debates.admin";

// DEB-06 GET /api/v1/c/{slug}/debates/{id}/arguments: the strongest first, all in one answer.
export const GET = route<{ slug: string; id: string }>(async ({ request, requestId, params }) => {
  const { jar, actorId, collegeId } = await memberContext(request, params.slug);
  return jar.applyTo(ok(await listArguments(actorId, collegeId, pathUuid(params.id)), requestId));
});

// DEB-05 POST /api/v1/c/{slug}/debates/{id}/arguments (IDEM)
// `body` 1 to 600 and `anonymous`. It goes under the side I chose: 400 when I have not chosen one, 409 after the end,
// 429 at 30 an hour.
export const POST = route<{ slug: string; id: string }>(async ({ request, requestId, params }) => {
  const { jar, slug, actorId, collegeId } = await memberContext(request, params.slug, {
    write: true,
  });
  const id = pathUuid(params.id);
  const body = await readJson(request, debateArgumentCreateBody);
  const key = readIdempotencyKey(request);
  const result = await withIdempotency(
    { userId: actorId, route: `POST debate-arguments ${slug} ${id}`, key, body },
    async () => ({ status: 201, data: await createArgument(actorId, collegeId, id, body) }),
  );
  return jar.applyTo(
    ok(result.data, requestId, {
      status: result.status,
      headers: result.replay ? { "Idempotent-Replay": "true" } : undefined,
    }),
  );
});
