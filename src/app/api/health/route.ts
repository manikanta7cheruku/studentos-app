import { newRequestId } from "@/lib/api";

// SYS-01 GET /api/health: is the app running? No database call, so it answers even when Supabase is down.
// `commit` lets the staging smoke test wait until the new version is the one that is live.
export function GET(request: Request) {
  const requestId = request.headers.get("x-request-id")?.slice(0, 64) || newRequestId();
  return Response.json(
    {
      status: "ok",
      commit: process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.GIT_COMMIT_SHA ?? null,
      environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? null,
    },
    { headers: { "Cache-Control": "no-store", "X-Request-Id": requestId } },
  );
}
