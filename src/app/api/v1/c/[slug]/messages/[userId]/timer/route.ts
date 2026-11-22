import { dmTimerBody } from "@/contracts";
import { ok, readJson, route } from "@/lib/api";
import { pathUuid } from "@/modules/admin/context";
import { memberContext } from "@/modules/engagement/context";
import { setTimer } from "@/modules/messages/messages.admin";

// MSG-06 PUT /api/v1/c/{slug}/messages/{userId}/timer   { "minutes": 60 | 420 | 1440 }
// Changes how long messages stay after they are opened, for this chat. Either person can do it. It only affects messages sent
// from now on. 409 CONFLICT while the conversation is still a request (or does not exist yet), 400 for any other number.
export const PUT = route<{ slug: string; userId: string }>(
  async ({ request, requestId, params }) => {
    const { jar, actorId, collegeId } = await memberContext(request, params.slug, { write: true });
    const body = await readJson(request, dmTimerBody);
    return jar.applyTo(
      ok(await setTimer(actorId, collegeId, pathUuid(params.userId), body.minutes), requestId),
    );
  },
);
