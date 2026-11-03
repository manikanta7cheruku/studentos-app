import type { z } from "zod";
import type { ErrorCode } from "@/contracts";

export interface ApiErrorOptions {
  code: string;
  message: string;
  status: number;
  requestId?: string;
  details?: Record<string, unknown>;
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

  constructor(options: ApiErrorOptions) {
    super(options.message, { cause: options.cause });
    this.name = "ApiError";
    this.code = options.code;
    this.status = options.status;
    this.requestId = options.requestId;
    this.details = options.details;
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
}

const API_BASE = "/api/v1";

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

/**
 * Browser-safe typed API client for StudentOS.
 * - Sends fetch requests under /api/v1 with JSON
 * - Includes session cookies (credentials: "include"); never stores or attaches tokens manually
 * - Reads { data, meta } success envelopes and { error: { code, message, details, request_id } } error envelopes
 * - Converts all failures (network error, bad JSON, error envelope, schema mismatch) into ApiError
 * - Returns typed data with optional Zod schema validation
 */
export async function apiClient<T = unknown>(
  path: string,
  options: ApiClientOptions<T> = {},
): Promise<T> {
  const { body, schema, headers, ...init } = options;
  const url = resolveUrl(path);

  const requestHeaders = new Headers(headers);
  requestHeaders.set("Accept", "application/json");

  let serializedBody: BodyInit | undefined;
  if (body !== undefined) {
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
    throw new ApiError({
      code: "UPSTREAM_UNAVAILABLE",
      message: err instanceof Error ? err.message : "Network request failed",
      status: 503,
      cause: err,
    });
  }

  const requestIdHeader = response.headers.get("x-request-id") ?? undefined;

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
    const errorBody = rawJson as ApiErrorEnvelope;
    const errorPayload = errorBody?.error;

    if (errorPayload && typeof errorPayload === "object") {
      throw new ApiError({
        code: (errorPayload.code as ErrorCode) || "INTERNAL",
        message: errorPayload.message || "An error occurred",
        status: response.status || 500,
        requestId: errorPayload.request_id || requestIdHeader,
        details: errorPayload.details,
      });
    }

    throw new ApiError({
      code: "INTERNAL",
      message: response.statusText || "Request failed",
      status: response.status || 500,
      requestId: requestIdHeader,
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
  const data = envelope.data;

  if (schema) {
    const parsed = schema.safeParse(data);
    if (!parsed.success) {
      throw new ApiError({
        code: "VALIDATION_FAILED",
        message: "Response data failed schema validation",
        status: 500,
        requestId: envelope.meta?.request_id || requestIdHeader,
        details: { issues: parsed.error.issues },
      });
    }
    return parsed.data;
  }

  return data;
}

/**
 * Variant of apiClient that returns the full { data, meta } envelope.
 * Useful for paginated lists where meta.next_cursor is needed.
 */
export async function apiFetchEnvelope<T = unknown>(
  path: string,
  options: ApiClientOptions<T> = {},
): Promise<ApiSuccessEnvelope<T>> {
  const { body, schema, headers, ...init } = options;
  const url = resolveUrl(path);

  const requestHeaders = new Headers(headers);
  requestHeaders.set("Accept", "application/json");

  let serializedBody: BodyInit | undefined;
  if (body !== undefined) {
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
    throw new ApiError({
      code: "UPSTREAM_UNAVAILABLE",
      message: err instanceof Error ? err.message : "Network request failed",
      status: 503,
      cause: err,
    });
  }

  const requestIdHeader = response.headers.get("x-request-id") ?? undefined;

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

  if (!response.ok || (rawJson && typeof rawJson === "object" && "error" in rawJson)) {
    const errorBody = rawJson as ApiErrorEnvelope;
    const errorPayload = errorBody?.error;

    if (errorPayload && typeof errorPayload === "object") {
      throw new ApiError({
        code: (errorPayload.code as ErrorCode) || "INTERNAL",
        message: errorPayload.message || "An error occurred",
        status: response.status || 500,
        requestId: errorPayload.request_id || requestIdHeader,
        details: errorPayload.details,
      });
    }

    throw new ApiError({
      code: "INTERNAL",
      message: response.statusText || "Request failed",
      status: response.status || 500,
      requestId: requestIdHeader,
    });
  }

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
