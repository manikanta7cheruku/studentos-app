import { newRequestId } from "@/lib/api";
import { createAnonClient } from "@/lib/supabase/request-client";

// SYS-01 GET /api/ready: can the app reach its database? 200 when yes, 503 when no (docs/ERROR_HANDLING.md F5).
// It reads the public branding view with the anon key, so it needs no secret and shows no private data.
export async function GET(request: Request) {
  const requestId = request.headers.get("x-request-id")?.slice(0, 64) || newRequestId();
  const headers = { "Cache-Control": "no-store", "X-Request-Id": requestId };
  try {
    const { error } = await createAnonClient()
      .from("public_college_branding")
      .select("slug")
      .limit(1);
    if (error) throw error;
    return Response.json({ status: "ready" }, { headers });
  } catch {
    return Response.json({ status: "unavailable" }, { status: 503, headers });
  }
}
