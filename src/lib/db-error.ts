import { errorCodes, type ErrorCode } from "@/contracts";
import { AppError } from "./errors";

// Our SQL functions raise errors whose message is the API error code (for example INVITE_EXPIRED).
// Anything else from the database becomes a safe error. The cause is kept for the log only.
export function mapDbError(error: { code?: string; message: string }): AppError {
  if (error.code === "P0001") {
    if (error.message === "VALIDATION_FAILED") {
      return new AppError("VALIDATION_FAILED", {
        details: { fields: [{ path: "(body)", message: "One of the values is not allowed." }] },
      });
    }
    if ((errorCodes as readonly string[]).includes(error.message)) {
      return new AppError(error.message as ErrorCode);
    }
    if (error.message === "LAST_ADMIN") {
      return new AppError("CONFLICT", {
        message: "A college must keep at least one active admin.",
      });
    }
    if (error.message === "DOMAIN_NOT_ALLOWED") {
      return new AppError("VALIDATION_FAILED", {
        details: {
          fields: [{ path: "email", message: "Use an email address from this college." }],
        },
      });
    }
  }
  // 23505 unique violation
  if (error.code === "23505") return new AppError("CONFLICT");
  // 23514 check violation: the last admin trigger, or a table rule such as "at least one join method"
  if (error.code === "23514") {
    if (error.message.includes("at least one active admin")) {
      return new AppError("CONFLICT", {
        message: "A college must keep at least one active admin.",
      });
    }
    return new AppError("VALIDATION_FAILED", {
      details: { fields: [{ path: "(body)", message: "One of the values is not allowed." }] },
    });
  }
  // 22xxx: a value of the wrong shape reached the database
  if (error.code?.startsWith("22")) {
    return new AppError("VALIDATION_FAILED", {
      details: { fields: [{ path: "(body)", message: "One of the values is not valid." }] },
    });
  }
  return new AppError("UPSTREAM_UNAVAILABLE", { cause: error });
}
