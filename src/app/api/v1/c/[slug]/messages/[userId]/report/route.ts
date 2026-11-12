import { dmReportBody } from "@/contracts";
import { ok, readJson, route } from "@/lib/api";
import { pathUuid } from "@/modules/admin/context";
import { memberContext } from "@/modules/engagement/context";
import { reportThread } from "@/modules/messages/messages.admin";

// MSG-04 POST /api/v1/c/{slug}/messages/{userId}/report   { "reason": "harassment", "details": "optional" }
// Reports the other person to the moderators of this college. The recent messages are copied into the report (they will be
// gone from the conversation soon). 409 CONFLICT when I already have an open report about them.
export const POST = route<{ slug: string; userId: string }>(
  async ({ request, requestId, params }) => {
    const { jar, actorId, collegeId } = await memberContext(request, params.slug, { write: true });
    const body = await readJson(request, dmReportBody);
    return jar.applyTo(
      ok(await reportThread(actorId, collegeId, pathUuid(params.userId), body), requestId, {
        status: 201,
      }),
    );
  },
);
