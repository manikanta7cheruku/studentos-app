import { ok, route } from "@/lib/api";
import { memberContext } from "@/modules/engagement/context";
import { listThreads } from "@/modules/messages/messages.admin";

// MSG-01 GET /api/v1/c/{slug}/messages
// My conversations that still have a message, newest first. Only how many are waiting is shown, never the words.
export const GET = route<{ slug: string }>(async ({ request, requestId, params }) => {
  const { jar, actorId, collegeId } = await memberContext(request, params.slug);
  return jar.applyTo(ok(await listThreads(actorId, collegeId), requestId));
});
