import { ok, route } from "@/lib/api";
import { pathUuid } from "@/modules/admin/context";
import { meContext } from "@/modules/engagement/context";
import { applaudEntry } from "@/modules/social/social.admin";

// CHL-03 PUT /api/v1/challenge-entries/{id}/applause: applaud an answer. Not your own (400). Safe to repeat.
export const PUT = route<{ id: string }>(async ({ request, requestId, params }) => {
  const { jar, userId } = await meContext(request, { write: true });
  return jar.applyTo(ok(await applaudEntry(userId, pathUuid(params.id), true), requestId));
});

// CHL-03 DELETE: take the applause back. Safe to repeat.
export const DELETE = route<{ id: string }>(async ({ request, requestId, params }) => {
  const { jar, userId } = await meContext(request, { write: true });
  return jar.applyTo(ok(await applaudEntry(userId, pathUuid(params.id), false), requestId));
});
