import { otpVerifyBody } from "@/contracts";
import { ok, readJson, route } from "@/lib/api";
import { CookieJar, createUserClient } from "@/lib/supabase/request-client";
import { verifyOtp } from "@/modules/auth/otp";

// AUTH-02 POST /api/v1/auth/otp/verify. Sets the session cookies on success.
export const POST = route(async ({ request, requestId }) => {
  const body = await readJson(request, otpVerifyBody);
  const jar = new CookieJar();
  const data = await verifyOtp(createUserClient(request, jar), body);
  return jar.applyTo(ok(data, requestId));
});
