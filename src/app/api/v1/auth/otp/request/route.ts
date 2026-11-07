import { otpRequestBody } from "@/contracts";
import { assertSameOrigin, clientIp, ok, readJson, route } from "@/lib/api";
import { requestOtp } from "@/modules/auth/otp";

// AUTH-01 POST /api/v1/auth/otp/request
// The origin is checked too: a page of another website cannot make a visitor's browser ask for codes.
export const POST = route(async ({ request, requestId }) => {
  assertSameOrigin(request);
  const body = await readJson(request, otpRequestBody);
  const data = await requestOtp({ email: body.email, ip: clientIp(request) });
  return ok(data, requestId);
});
