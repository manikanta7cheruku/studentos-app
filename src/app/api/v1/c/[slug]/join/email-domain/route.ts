import { joinEmailDomainBody, slug as slugSchema } from "@/contracts";
import { assertSameOrigin, clientIp, ok, readJson, route } from "@/lib/api";
import { AppError, validationError } from "@/lib/errors";
import { CookieJar, createAnonClient, getCurrentUser } from "@/lib/supabase/request-client";
import { checkCode, requestOtp } from "@/modules/auth/otp";
import {
  completeEmailDomainJoin,
  emailDomainAllowed,
  joinPrepare,
} from "@/modules/tenancy/join.admin";

const domainOf = (email: string) => email.slice(email.lastIndexOf("@") + 1).toLowerCase();

// TEN-05 POST /api/v1/c/{slug}/join/email-domain
//   step "start": send a code to a college address. The address must be on a verified domain of this
//                 college, so this endpoint cannot be used to send mail to anyone.
//   step "complete": check the code. The person proved they control that address, so the membership
//                    becomes active at level 2.
export const POST = route<{ slug: string }>(async ({ request, requestId, params }) => {
  assertSameOrigin(request);
  const slug = slugSchema.safeParse(params.slug);
  if (!slug.success) throw new AppError("NOT_FOUND");
  const body = await readJson(request, joinEmailDomainBody);
  const jar = new CookieJar();
  const { user } = await getCurrentUser(request, jar);

  // Stop early if the person cannot join (already a member, suspended college, method switched off).
  await joinPrepare(user.id, slug.data, "email_domain");

  if (body.step === "start") {
    if (!(await emailDomainAllowed(slug.data, domainOf(body.email)))) {
      throw validationError([
        { path: "email", message: "Use an email address from this college." },
      ]);
    }
    const sent = await requestOtp({ email: body.email, ip: clientIp(request) });
    return jar.applyTo(ok(sent, requestId));
  }

  // The code is checked on a client that keeps no session. The signed-in user stays as they are.
  const proven = await checkCode(createAnonClient(), { email: body.email, code: body.code });
  const provenEmail = proven.email ?? body.email;
  const membership = await completeEmailDomainJoin(
    user.id,
    slug.data,
    domainOf(provenEmail),
    requestId,
  );
  return jar.applyTo(ok({ membership }, requestId));
});
