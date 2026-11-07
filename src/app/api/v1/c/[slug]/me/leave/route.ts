import { slug as slugSchema } from "@/contracts";
import { assertSameOrigin, ok, route } from "@/lib/api";
import { AppError } from "@/lib/errors";
import { CookieJar, getCurrentUser } from "@/lib/supabase/request-client";
import { limitWrites } from "@/lib/write-limit";
import { leaveCollege } from "@/modules/account/account.admin";

// TEN-07 POST /api/v1/c/{slug}/me/leave: leave this college.
// Active members and people waiting for approval may leave. A suspended or rejected person may not (403), someone who
// never joined gets 404, someone who already left gets 409. The last admin cannot leave (409): make another admin first.
// Leaving closes your open team posts, withdraws your requests and gives back your team seats. You can join again later.
export const POST = route<{ slug: string }>(async ({ request, requestId, params }) => {
  assertSameOrigin(request);
  const slug = slugSchema.safeParse(params.slug);
  if (!slug.success) throw new AppError("NOT_FOUND");
  const jar = new CookieJar();
  const { user } = await getCurrentUser(request, jar);
  await limitWrites(user.id);
  const membership = await leaveCollege(user.id, slug.data, requestId);
  return jar.applyTo(ok({ membership }, requestId));
});
