/**
 * Stable API error codes. Clients branch on these, never on messages.
 * See `docs/plans/02-backend-api.md`.
 */
export const ERROR_CODES = [
  "VALIDATION_ERROR",
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "NOT_FOUND",
  "CONFLICT",
  "INSUFFICIENT_CREDITS",
  "RATE_LIMITED",
  "CONTENT_REJECTED",
  "PROVIDER_ERROR",
  "INTERNAL",
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export class AppError extends Error {
  readonly status: number;
  readonly code: ErrorCode;
  readonly details?: unknown;

  constructor(status: number, code: ErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function badRequest(message: string, details?: unknown): AppError {
  return new AppError(400, "VALIDATION_ERROR", message, details);
}

export function unauthorized(message = "Sign in to continue"): AppError {
  return new AppError(401, "UNAUTHENTICATED", message);
}

export function forbidden(message = "You do not have access to this resource"): AppError {
  return new AppError(403, "FORBIDDEN", message);
}

export function notFound(message = "Not found"): AppError {
  return new AppError(404, "NOT_FOUND", message);
}

export function conflict(message: string): AppError {
  return new AppError(409, "CONFLICT", message);
}

export function insufficientCredits(needed: number, balance: number): AppError {
  return new AppError(402, "INSUFFICIENT_CREDITS", "Not enough credits", {
    needed,
    balance,
  });
}

export function rateLimited(retryAfterSeconds: number): AppError {
  return new AppError(429, "RATE_LIMITED", "Too many requests", {
    retryAfterSeconds,
  });
}

export function contentRejected(message = "This content is not allowed"): AppError {
  return new AppError(422, "CONTENT_REJECTED", message);
}

export function providerError(message: string, details?: unknown): AppError {
  return new AppError(502, "PROVIDER_ERROR", message, details);
}

export interface PostgresError {
  code?: string;
  constraint?: string;
}

export function isUniqueViolation(error: unknown, constraint?: string): boolean {
  // Drizzle 0.45 wraps driver errors in `DrizzleQueryError`, so the Postgres
  // error (with its `code` and `constraint`) is found on the cause chain.
  let current: unknown = error;

  for (let depth = 0; depth < 5 && typeof current === "object" && current !== null; depth += 1) {
    const candidate = current as PostgresError & { cause?: unknown };
    if (candidate.code === "23505") {
      return constraint ? candidate.constraint === constraint : true;
    }
    current = candidate.cause;
  }

  return false;
}
