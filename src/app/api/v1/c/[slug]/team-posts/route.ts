import { teamPostCreateBody, teamPostListQuery } from "@/contracts";
import { ok, readJson, readQuery, route } from "@/lib/api";
import { decodeCursor } from "@/lib/cursor";
import { readIdempotencyKey, withIdempotency } from "@/lib/idempotency.admin";
import { memberContext } from "@/modules/engagement/context";
import { createTeamPost, listTeamPosts } from "@/modules/teamfinder/teamfinder.admin";

// TMF-02 GET /api/v1/c/{slug}/team-posts?kind=&status=open&skill=&q=&mine=true&limit=20&cursor=
// Newest first. `status` is open by default (use all for everything). `mine=true` lists my own posts.
// Hidden posts, posts of people who left, and posts of someone you blocked (or who blocked you) never appear.
export const GET = route<{ slug: string }>(async ({ request, requestId, params }) => {
  const { jar, actorId, collegeId } = await memberContext(request, params.slug);
  const query = readQuery(request, teamPostListQuery);
  const { items, nextCursor } = await listTeamPosts(actorId, collegeId, {
    kind: query.kind,
    status: query.status,
    skill: query.skill,
    q: query.q,
    mine: query.mine === "true",
    limit: query.limit,
    cursor: decodeCursor(query.cursor),
  });
  return jar.applyTo(ok(items, requestId, { nextCursor }));
});

// TMF-01 POST /api/v1/c/{slug}/team-posts (IDEM)
// 1 to 8 roles with 1 to 20 slots, a deadline up to 180 days away, https links only, skills must exist.
// 403 VERIFICATION_LEVEL_TOO_LOW if the college asks for a higher level to post. At most 10 open posts per person.
export const POST = route<{ slug: string }>(async ({ request, requestId, params }) => {
  const { jar, slug, actorId, collegeId } = await memberContext(request, params.slug, {
    write: true,
  });
  const body = await readJson(request, teamPostCreateBody);
  const key = readIdempotencyKey(request);
  const result = await withIdempotency(
    { userId: actorId, route: `POST team-posts ${slug}`, key, body },
    async () => ({ status: 201, data: await createTeamPost(actorId, collegeId, body) }),
  );
  return jar.applyTo(
    ok(result.data, requestId, {
      status: result.status,
      headers: result.replay ? { "Idempotent-Replay": "true" } : undefined,
    }),
  );
});
