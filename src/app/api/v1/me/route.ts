import { deleteMeBody } from "@/contracts";
import { assertSameOrigin, clientIp, ok, readJson, route } from "@/lib/api";
import { AppError } from "@/lib/errors";
import { CookieJar, createAnonClient, getCurrentUser } from "@/lib/supabase/request-client";
import { limitWrites } from "@/lib/write-limit";
import { accountBlockers, deleteAccount } from "@/modules/account/account.admin";
import { checkCode, requestOtp } from "@/modules/auth/otp";

// AUTH-04 DELETE /api/v1/me: delete my account for good. Two steps with the same call, so a stolen session alone
// cannot delete an account (it also needs the mailbox):
//   {}                      -> a 6 digit code is emailed to me, answer { deletion_requested: true, confirmation: "otp" }
//   { "code": "123456" }    -> the code is checked, everything of mine is deleted, answer { deleted: true }
// 409 CONFLICT if I am the only admin of a college (name in the message). 400 OTP_INVALID / 410 OTP_EXPIRED for a bad code.
export const DELETE = route(async ({ request, requestId }) => {
  assertSameOrigin(request);
  const jar = new CookieJar();
  const { user, supabase } = await getCurrentUser(request, jar);
  await limitWrites(user.id);
  const body = await readJson(request, deleteMeBody);
  const email = user.email;
  if (!email) throw new AppError("FORBIDDEN");

  const blockers = await accountBlockers(user.id);
  if (blockers.length > 0) {
    throw new AppError("CONFLICT", {
      message: `You are the only admin of ${blockers.join(", ")}. Make another person admin first.`,
    });
  }

  if (!body.code) {
    await requestOtp({ email, ip: clientIp(request) });
    return jar.applyTo(ok({ deletion_requested: true, confirmation: "otp" }, requestId));
  }

  // The code must belong to this very account. A separate client is used, so no new session is created.
  const confirmed = await checkCode(createAnonClient(), { email, code: body.code });
  if (confirmed.id !== user.id) throw new AppError("FORBIDDEN");
  // End every session first (this also clears the cookies), then delete.
  await supabase.auth.signOut({ scope: "global" });
  await deleteAccount(user.id, requestId);
  return jar.applyTo(ok({ deleted: true }, requestId));
});
