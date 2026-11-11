import { eventCreateBody, eventListQuery } from "@/contracts";
import { ok, readJson, readQuery, route } from "@/lib/api";
import { readIdempotencyKey, withIdempotency } from "@/lib/idempotency.admin";
import { memberContext } from "@/modules/engagement/context";
import { createEvent, listEvents } from "@/modules/community/community.admin";

// EVT-02 GET /api/v1/c/{slug}/events?when=upcoming|past&mine=true&limit=50
// Upcoming is soonest first and includes events that started less than 3 hours ago. One page, at most 100.
// Events of people who left, and of someone you blocked (or who blocked you), never appear.
export const GET = route<{ slug: string }>(async ({ request, requestId, params }) => {
  const { jar, actorId, collegeId } = await memberContext(request, params.slug);
  const query = readQuery(request, eventListQuery);
  return jar.applyTo(
    ok(
      await listEvents(actorId, collegeId, {
        when: query.when,
        mine: query.mine === "true",
        limit: query.limit,
      }),
      requestId,
    ),
  );
});

// EVT-01 POST /api/v1/c/{slug}/events (IDEM)
// `title` 5 to 120, `description` up to 2000, `starts_at` in the future within a year, optional `place` and `capacity`.
// 201 with the event. The author goes by default. 429 at 10 upcoming events per person.
export const POST = route<{ slug: string }>(async ({ request, requestId, params }) => {
  const { jar, slug, actorId, collegeId } = await memberContext(request, params.slug, {
    write: true,
  });
  const body = await readJson(request, eventCreateBody);
  const key = readIdempotencyKey(request);
  const result = await withIdempotency(
    { userId: actorId, route: `POST events ${slug}`, key, body },
    async () => ({ status: 201, data: await createEvent(actorId, collegeId, body) }),
  );
  return jar.applyTo(
    ok(result.data, requestId, {
      status: result.status,
      headers: result.replay ? { "Idempotent-Replay": "true" } : undefined,
    }),
  );
});
