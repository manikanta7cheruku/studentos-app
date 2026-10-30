import { ZodError } from "zod";
import { errorHttpStatus, type ErrorCode } from "@/contracts";

// Friendly default messages. Screens map `code` to their own wording, so keep these short and safe.
const defaultMessages: Record<ErrorCode, string> = {
  VALIDATION_FAILED: "Check the highlighted fields.",
  UNAUTHENTICATED: "Please sign in to continue.",
  FORBIDDEN: "You do not have permission to do that.",
  MEMBERSHIP_NOT_ACTIVE: "Your membership is not active yet.",
  VERIFICATION_LEVEL_TOO_LOW: "Your college needs a higher verification level for this.",
  TENANT_SUSPENDED: "This college is not available right now.",
  FEATURE_DISABLED: "We could not find that page.",
  NOT_FOUND: "We could not find that item.",
  CONFLICT: "That conflicts with the current state. Reload and try again.",
  VERSION_CONFLICT: "Someone changed this item. Reload and try again.",
  SLOTS_FULL: "That role was just filled.",
  ALREADY_REQUESTED: "You already asked to join this role.",
  INVITE_INVALID: "We could not find that invite code.",
  INVITE_EXHAUSTED: "That invite code has been used up. Ask your college admin for a new one.",
  INVITE_EXPIRED: "That invite code has expired. Ask your college admin for a new one.",
  OTP_INVALID: "That code is not right. Check it and try again.",
  OTP_EXPIRED: "That code has expired. Ask for a new one.",
  IDEMPOTENCY_KEY_REUSED: "That request key was already used with different data.",
  PAYLOAD_TOO_LARGE: "That is too large.",
  UNSUPPORTED_MEDIA_TYPE: "That type of request is not supported.",
  RATE_LIMITED: "Too many attempts. Try again later.",
  UPSTREAM_UNAVAILABLE: "Something we depend on is down. Try again in a minute.",
  INTERNAL: "Something went wrong on our side.",
};

export type AppErrorOptions = {
  message?: string;
  details?: Record<string, unknown>;
  headers?: Record<string, string>;
  cause?: unknown;
};

// The only error type that leaves the API with its own code. Anything else becomes INTERNAL.
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly details?: Record<string, unknown>;
  readonly headers: Record<string, string>;

  constructor(code: ErrorCode, options: AppErrorOptions = {}) {
    super(options.message ?? defaultMessages[code], { cause: options.cause });
    this.name = "AppError";
    this.code = code;
    this.details = options.details;
    this.headers = options.headers ?? {};
  }

  get status(): number {
    return errorHttpStatus[this.code];
  }
}

export function validationError(fields: { path: string; message: string }[]): AppError {
  return new AppError("VALIDATION_FAILED", { details: { fields } });
}

export function fromZodError(error: ZodError): AppError {
  const fields = error.issues.map((issue) => ({
    path: issue.path.length > 0 ? issue.path.map(String).join(".") : "(body)",
    message: issue.message,
  }));
  return validationError(
    fields.length > 0 ? fields : [{ path: "(body)", message: "Invalid input." }],
  );
}

// 429 with a Retry-After header (seconds).
export function rateLimited(retryAfterSeconds: number): AppError {
  const seconds = Math.max(1, Math.ceil(retryAfterSeconds));
  return new AppError("RATE_LIMITED", {
    details: { retry_after_seconds: seconds },
    headers: { "Retry-After": String(seconds) },
  });
}

export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  if (error instanceof ZodError) return fromZodError(error);
  return new AppError("INTERNAL", { cause: error });
}

export function errorBody(error: AppError, requestId: string) {
  return {
    error: {
      code: error.code,
      message: error.message,
      ...(error.details ? { details: error.details } : {}),
      request_id: requestId,
    },
  };
}
