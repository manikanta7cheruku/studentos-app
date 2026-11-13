import { ok, route } from "@/lib/api";
import { pathUuid } from "@/modules/admin/context";
import { memberContext } from "@/modules/engagement/context";
import { declineRequest } from "@/modules/messages/messages.admin";

// MSG-05 POST /api/v1/c/{slug}/messages/{userId}/decline
// "Not interested" in a request from that person. Their request message is deleted, and they are told (in the thread, kindly)
// that I am not available right now. They can ask again after 5 days. 404 when there is no open request from them.
export const POST = route<{ slug: string; userId: string }>(
  async ({ request, requestId, params }) => {
    const { jar, actorId, collegeId } = await memberContext(request, params.slug, { write: true });
    return jar.applyTo(
      ok(await declineRequest(actorId, collegeId, pathUuid(params.userId)), requestId),
    );
  },
);
