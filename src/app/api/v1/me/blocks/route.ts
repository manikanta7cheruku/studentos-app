import { ok, route } from "@/lib/api";
import { meContext } from "@/modules/engagement/context";
import { listBlocks } from "@/modules/engagement/engagement.admin";

// RPT-05 GET /api/v1/me/blocks: the people I blocked, newest first. Unblock one with RPT-04 DELETE.
export const GET = route(async ({ request, requestId }) => {
  const { jar, userId } = await meContext(request);
  return jar.applyTo(ok(await listBlocks(userId), requestId));
});
