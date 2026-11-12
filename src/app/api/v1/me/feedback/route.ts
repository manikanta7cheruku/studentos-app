import { feedbackCreateBody } from "@/contracts";
import { ok, readJson, route } from "@/lib/api";
import { meContext } from "@/modules/engagement/context";
import { createFeedback } from "@/modules/feedback/feedback.admin";

// FDB-01 POST /api/v1/me/feedback   { "kind": "idea" | "problem" | "other", "message": "5 to 1500 characters", "page": "/c/alpha/turf" }
// A short note to the team, from any signed in person. 201. 429 at 10 a day. The owner reads it in the dashboard.
export const POST = route(async ({ request, requestId }) => {
  const { jar, userId } = await meContext(request, { write: true });
  const body = await readJson(request, feedbackCreateBody);
  return jar.applyTo(ok(await createFeedback(userId, null, body), requestId, { status: 201 }));
});
