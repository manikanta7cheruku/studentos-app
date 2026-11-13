import { randomUUID } from "node:crypto";
import { after } from "next/server";
import type { ZodType } from "zod";
import { AppError, errorBody, fromZodError, toAppError } from "./errors";
import { serverEnv } from "./env";

const MAX_JSON_BYTES = 100 * 1024;

export function newRequestId(): string {
  return `req_${randomUUID().replaceAll("-", "").slice(0, 16)}`;
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip")?.trim() || "unknown";
}

export function bearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  return scheme?.toLowerCase() === "bearer" && token ? token : null;
}

// Reads a request body but stops as soon as it is bigger than `maxBytes` (413 PAYLOAD_TOO_LARGE), even when the
// sender gave no Content-Length or lied about it. The body is never held in memory beyond the cap.
export async function readBodyCapped(
  request: Request,
  maxBytes: number,
): Promise<Uint8Array<ArrayBuffer>> {
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > maxBytes) throw new AppError("PAYLOAD_TOO_LARGE");
  if (!request.body) return new Uint8Array();
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => undefined);
      throw new AppError("PAYLOAD_TOO_LARGE");
    }
    chunks.push(value);
  }
  const all = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    all.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return all;
}

// Parse a JSON body with a Zod schema. Bad JSON, a wrong content type, a big body or a wrong shape
// all become the stable error codes of docs/API_CONTRACT.md section 2.
export async function readJson<T>(request: Request, schema: ZodType<T>): Promise<T> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new AppError("UNSUPPORTED_MEDIA_TYPE");
  }
  const text = new TextDecoder().decode(await readBodyCapped(request, MAX_JSON_BYTES));
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new AppError("VALIDATION_FAILED", {
      details: { fields: [{ path: "(body)", message: "The body is not valid JSON." }] },
    });
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) throw fromZodError(parsed.error);
  return parsed.data;
}

// Query strings: unknown parameters are refused (docs/API_CONTRACT.md section 1).
export function readQuery<T>(request: Request, schema: ZodType<T>): T {
  const params: Record<string, string> = {};
  for (const [key, value] of new URL(request.url).searchParams) params[key] = value;
  const parsed = schema.safeParse(params);
  if (!parsed.success) throw fromZodError(parsed.error);
  return parsed.data;
}

// CSRF guard for browser requests that carry the session cookie.
// A request with an Authorization header (tests, tools) has no cookie to steal, so it is skipped.
export function assertSameOrigin(request: Request): void {
  if (bearerToken(request)) return;
  const origin = request.headers.get("origin");
  const expectedHost = new URL(serverEnv().NEXT_PUBLIC_APP_URL).host;
  if (origin) {
    let host: string | null = null;
    try {
      host = new URL(origin).host;
    } catch {
      host = null;
    }
    if (host !== expectedHost) throw new AppError("FORBIDDEN");
    return;
  }
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none") throw new AppError("FORBIDDEN");
}

type ResponseOptions = {
  status?: number;
  headers?: Record<string, string>;
  nextCursor?: string | null;
};

// Postgres returns timestamps like 2026-10-31T09:00:00+00:00. The contract wants UTC with a Z.
export function toIso(value: string | null): string | null {
  return value === null ? null : new Date(value).toISOString();
}

export function ok(data: unknown, requestId: string, options: ResponseOptions = {}): Response {
  const meta: Record<string, unknown> = { request_id: requestId };
  if (options.nextCursor !== undefined) meta.next_cursor = options.nextCursor;
  return Response.json(
    { data, meta },
    {
      status: options.status ?? 200,
      headers: { "Cache-Control": "no-store", "X-Request-Id": requestId, ...options.headers },
    },
  );
}

export function failure(error: AppError, requestId: string): Response {
  return Response.json(errorBody(error, requestId), {
    status: error.status,
    headers: { "Cache-Control": "no-store", "X-Request-Id": requestId, ...error.headers },
  });
}

type Handler<P> = (args: { request: Request; requestId: string; params: P }) => Promise<Response>;

// After a change was saved, send the phone alerts it caused, once the answer has gone out. Does nothing for reads or when
// alerts are not set up, and never affects the answer.
function sendAlertsAfter(request: Request, response: Response) {
  if (request.method === "GET" || request.method === "HEAD" || response.status >= 400) return;
  if (!process.env.VAPID_PRIVATE_KEY) return;
  try {
    after(async () => {
      const { dispatchPending } = await import("@/modules/push/push.admin");
      await dispatchPending().catch((error) => console.error("alerts:", error));
    });
  } catch {
    // Not inside a request (a test): nothing to do.
  }
}

// Wraps a route handler: request id, error envelope, no stack traces or secrets in the answer.
export function route<P = Record<string, never>>(handler: Handler<P>) {
  return async (request: Request, context?: { params: Promise<P> }): Promise<Response> => {
    const requestId = request.headers.get("x-request-id")?.slice(0, 64) || newRequestId();
    try {
      const params = (context ? await context.params : {}) as P;
      const response = await handler({ request, requestId, params });
      sendAlertsAfter(request, response);
      return response;
    } catch (error) {
      const appError = toAppError(error);
      if (appError.code === "INTERNAL") {
        // Details go to the log only. No email, code or token is ever logged here.
        console.error(`[${requestId}] unexpected error:`, appError.cause ?? appError);
      }
      return failure(appError, requestId);
    }
  };
}
