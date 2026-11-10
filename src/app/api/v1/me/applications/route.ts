import { applicationCreateBody, applicationListQuery } from "@/contracts";
import { ok, readJson, readQuery, route } from "@/lib/api";
import { readIdempotencyKey, withIdempotency } from "@/lib/idempotency.admin";
import { meContext } from "@/modules/engagement/context";
import { createApplication, listApplications } from "@/modules/applications/applications.admin";

// APP-02 GET /api/v1/me/applications?status=&sort=updated|deadline&q=
// My own applications (at most 200). Nobody else can read them, not even a college admin.
export const GET = route(async ({ request, requestId }) => {
  const { jar, userId } = await meContext(request);
  const query = readQuery(request, applicationListQuery);
  return jar.applyTo(ok(await listApplications(userId, query), requestId));
});

// APP-01 POST /api/v1/me/applications (IDEM)
// `company` and `role_title` are required, the link must be https, the deadline and the applied date are dates
// (a deadline in the past is allowed). 429 RATE_LIMITED at 200 applications.
export const POST = route(async ({ request, requestId }) => {
  const { jar, userId } = await meContext(request, { write: true });
  const body = await readJson(request, applicationCreateBody);
  const key = readIdempotencyKey(request);
  const result = await withIdempotency(
    { userId, route: "POST me/applications", key, body },
    async () => ({ status: 201, data: await createApplication(userId, body) }),
  );
  return jar.applyTo(
    ok(result.data, requestId, {
      status: result.status,
      headers: result.replay ? { "Idempotent-Replay": "true" } : undefined,
    }),
  );
});
