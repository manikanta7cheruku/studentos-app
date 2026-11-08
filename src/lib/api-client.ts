import type { z } from "zod";
import type { ErrorCode } from "@/contracts";

export interface ApiErrorOptions {
  code: string;
  message: string;
  status: number;
  requestId?: string;
  details?: Record<string, unknown>;
  /** Seconds to wait before trying again (from the Retry-After header of a 429 or a 409 that says "still running"). */
  retryAfter?: number;
  cause?: unknown;
}

/**
 * Single error class for all frontend API failures.
 *
 * Why a separate client class instead of reusing R2's server AppError:
 * Server AppError is designed for backend route handlers and services: it maps error codes
 * to HTTP status codes, attaches internal response headers, and works with server loggers.
 * In the client/browser, we need an error class tailored for the UI: capturing the HTTP status,
 * the server's requestId (essential for user error screens and bug reports), structured field
 * details, or fallbacks for network drops and bad JSON. Keeping ApiError separate ensures the
 * client bundle is browser-safe, has zero server dependencies, and does not leak backend internals.
 */
export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly requestId?: string;
  readonly details?: Record<string, unknown>;
  readonly retryAfter?: number;

  constructor(options: ApiErrorOptions) {
    super(options.message, { cause: options.cause });
    this.name = "ApiError";
    this.code = options.code;
    this.status = options.status;
    this.requestId = options.requestId;
    this.details = options.details;
    this.retryAfter = options.retryAfter;
  }

  /** The person is not signed in (or the session ended). The screen should send them to sign in. */
  get isSignedOut(): boolean {
    return this.status === 401 || this.code === "UNAUTHENTICATED";
  }

  /** The network or the server is down: nothing the person typed was wrong. */
  get isOffline(): boolean {
    return this.code === "UPSTREAM_UNAVAILABLE" || this.status === 503;
  }

  /** Field errors from VALIDATION_FAILED as { path -> message }. */
  get fieldErrors(): Record<string, string> {
    const fields = (this.details as { fields?: { path: string; message: string }[] } | undefined)
      ?.fields;
    return Object.fromEntries((fields ?? []).map((f) => [f.path, f.message]));
  }
}

export interface ApiMeta {
  request_id: string;
  next_cursor?: string | null;
  [key: string]: unknown;
}

export interface ApiSuccessEnvelope<T> {
  data: T;
  meta: ApiMeta;
}

export interface ApiErrorEnvelope {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    request_id?: string;
  };
}

export interface ApiClientOptions<T = unknown> extends Omit<RequestInit, "body"> {
  body?: unknown;
  /** Optional Zod schema to validate the returned data (or the response envelope) */
  schema?: z.ZodType<T>;
  /** Send a fresh Idempotency-Key header (needed by the calls marked IDEM in docs/API_CONTRACT.md). */
  idempotent?: boolean | string;
}

const API_BASE = "/api/v1";

/** A new random key for one user action. Reuse the SAME key only to retry that same action. */
export function newIdempotencyKey(): string {
  return globalThis.crypto.randomUUID();
}

function resolveUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  if (path.startsWith(API_BASE)) {
    return path;
  }
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}${cleanPath}`;
}

// The one place that talks to the network. apiClient and apiFetchEnvelope are thin wrappers around it.
async function request<T>(
  path: string,
  options: ApiClientOptions<T>,
): Promise<ApiSuccessEnvelope<T>> {
  const { body, schema, headers, idempotent, ...init } = options;
  const url = resolveUrl(path);

  const requestHeaders = new Headers(headers);
  requestHeaders.set("Accept", "application/json");
  if (idempotent) {
    requestHeaders.set(
      "Idempotency-Key",
      typeof idempotent === "string" ? idempotent : newIdempotencyKey(),
    );
  }

  let serializedBody: BodyInit | undefined;
  if (body instanceof FormData || body instanceof Blob || body instanceof ArrayBuffer) {
    serializedBody = body as BodyInit;
  } else if (body !== undefined) {
    requestHeaders.set("Content-Type", "application/json");
    serializedBody = typeof body === "string" ? body : JSON.stringify(body);
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      credentials: init.credentials ?? "include",
      headers: requestHeaders,
      body: serializedBody,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    throw new ApiError({
      code: "UPSTREAM_UNAVAILABLE",
      message: err instanceof Error ? err.message : "Network request failed",
      status: 503,
      cause: err,
    });
  }

  const requestIdHeader = response.headers.get("x-request-id") ?? undefined;
  const retryAfterHeader = Number(response.headers.get("retry-after"));
  const retryAfter =
    Number.isFinite(retryAfterHeader) && retryAfterHeader > 0 ? retryAfterHeader : undefined;

  let rawJson: unknown;
  try {
    rawJson = await response.json();
  } catch (err) {
    throw new ApiError({
      code: "INTERNAL",
      message: "Failed to parse response JSON",
      status: response.status || 500,
      requestId: requestIdHeader,
      cause: err,
    });
  }

  // Handle server error envelope or HTTP error status
  if (!response.ok || (rawJson && typeof rawJson === "object" && "error" in rawJson)) {
    const errorPayload = (rawJson as ApiErrorEnvelope | null)?.error;

    if (errorPayload && typeof errorPayload === "object") {
      throw new ApiError({
        code: (errorPayload.code as ErrorCode) || "INTERNAL",
        message: errorPayload.message || "An error occurred",
        status: response.status || 500,
        requestId: errorPayload.request_id || requestIdHeader,
        details: errorPayload.details,
        retryAfter,
      });
    }

    throw new ApiError({
      code: "INTERNAL",
      message: response.statusText || "Request failed",
      status: response.status || 500,
      requestId: requestIdHeader,
      retryAfter,
    });
  }

  // Handle success envelope { data, meta }
  if (!rawJson || typeof rawJson !== "object" || !("data" in rawJson)) {
    throw new ApiError({
      code: "INTERNAL",
      message: "Invalid response envelope: missing data property",
      status: response.status || 500,
      requestId: requestIdHeader,
    });
  }

  const envelope = rawJson as ApiSuccessEnvelope<T>;

  if (schema) {
    const parsed = schema.safeParse(envelope.data);
    if (!parsed.success) {
      throw new ApiError({
        code: "VALIDATION_FAILED",
        message: "Response data failed schema validation",
        status: 500,
        requestId: envelope.meta?.request_id || requestIdHeader,
        details: { issues: parsed.error.issues },
      });
    }
    return { data: parsed.data, meta: envelope.meta };
  }

  return envelope;
}

/**
 * Browser-safe typed API client for StudentOS.
 * - Sends fetch requests under /api/v1 with JSON
 * - Includes session cookies (credentials: "include"); never stores or attaches tokens manually
 * - Reads { data, meta } success envelopes and { error: { code, message, details, request_id } } error envelopes
 * - Converts all failures (network error, bad JSON, error envelope, schema mismatch) into ApiError
 * - Returns typed data with optional Zod schema validation
 * - `idempotent: true` adds a fresh Idempotency-Key for calls marked IDEM in the contract
 */
export async function apiClient<T = unknown>(
  path: string,
  options: ApiClientOptions<T> = {},
): Promise<T> {
  return (await request<T>(path, options)).data;
}

/**
 * Variant of apiClient that returns the full { data, meta } envelope.
 * Useful for paginated lists where meta.next_cursor is needed.
 */
export async function apiFetchEnvelope<T = unknown>(
  path: string,
  options: ApiClientOptions<T> = {},
): Promise<ApiSuccessEnvelope<T>> {
  return request<T>(path, options);
}

// Plain words for every error code, for screens that have no wording of their own.
// Screens should still prefer their own, more specific sentence where they have one.
const FRIENDLY: Partial<Record<string, string>> = {
  UNAUTHENTICATED: "Please sign in to continue.",
  FORBIDDEN: "You do not have permission to do that.",
  MEMBERSHIP_NOT_ACTIVE: "Your membership is not active yet.",
  NOT_FOUND: "We could not find that.",
  FEATURE_DISABLED: "Your college has not switched this on.",
  CONFLICT: "That changed while you were looking. Reload and try again.",
  RATE_LIMITED: "Too many tries. Please wait a moment.",
  UPSTREAM_UNAVAILABLE: "We could not reach the server. Check your connection and try again.",
  INVITE_INVALID: "That invite code is not right. Check it and try again.",
  INVITE_EXHAUSTED: "That invite code has been used up. Ask for a new one.",
  INVITE_EXPIRED: "That invite code has expired. Ask for a new one.",
  ALREADY_REQUESTED: "You already asked to join. We will tell you when it is decided.",
  OTP_INVALID: "That code is not right. Check it and try again.",
  OTP_EXPIRED: "That code has expired. Ask for a new one.",
  VALIDATION_FAILED: "Check the highlighted fields.",
  PAYLOAD_TOO_LARGE: "That file is too large.",
  UNSUPPORTED_MEDIA_TYPE: "That type of file is not supported.",
};

export function friendlyMessage(
  error: unknown,
  fallback = "Something went wrong. Please try again.",
): string {
  if (error instanceof ApiError) {
    if (error.code === "RATE_LIMITED" && error.retryAfter) {
      return `Too many tries. Please wait ${error.retryAfter} seconds.`;
    }
    return FRIENDLY[error.code] ?? error.message ?? fallback;
  }
  return fallback;
}
