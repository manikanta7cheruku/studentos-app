import { ok, route } from "@/lib/api";
import { pathUuid } from "@/modules/admin/context";
import { viewPerson } from "@/modules/account/account.admin";
import { memberContext } from "@/modules/engagement/context";

// PRF-06 GET /api/v1/c/{slug}/people/{userId}: one classmate's profile (name, headline, bio, skills, program, year).
// Same rule as the people directory: both are active members, the profile is not hidden (by the person or a moderator)
// and nobody blocked the other. Otherwise 404. There is never an email address.
export const GET = route<{ slug: string; userId: string }>(
  async ({ request, requestId, params }) => {
    const { jar, actorId, collegeId } = await memberContext(request, params.slug);
    return jar.applyTo(
      ok(await viewPerson(actorId, collegeId, pathUuid(params.userId)), requestId),
    );
  },
);
