import { otpRequestBody } from "@/contracts";
import { clientIp, ok, readJson, route } from "@/lib/api";
import { requestOtp } from "@/modules/auth/otp";

// AUTH-01 POST /api/v1/auth/otp/request
export const POST = route(async ({ request, requestId }) => {
  const body = await readJson(request, otpRequestBody);
  const data = await requestOtp({ email: body.email, ip: clientIp(request) });
  return ok(data, requestId);
});
