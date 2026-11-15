import { randomUUID } from "node:crypto";
import type { ErrorRequestHandler, RequestHandler, Response } from "express";
import { ZodError } from "zod";
import { isAppError } from "../lib/errors.js";
import type { Logger } from "../logger.js";
import { zodIssues } from "./validate.js";

export const REQUEST_ID_HEADER = "x-request-id";

const SAFE_REQUEST_ID = /^[A-Za-z0-9._-]{1,128}$/;

export function getRequestId(res: Response): string {
  const id: unknown = res.locals.requestId;
  return typeof id === "string" ? id : "unknown";
}

/**
 * Propagates a caller-supplied request id (Cloudflare sets one) or generates
 * ours, and exposes a request-scoped child logger.
 */
export function requestContext(logger: Logger): RequestHandler {
  return (req, res, next) => {
    const incoming = req.header(REQUEST_ID_HEADER);
    const requestId = incoming && SAFE_REQUEST_ID.test(incoming) ? incoming : randomUUID();

    res.locals.requestId = requestId;
    res.locals.log = logger.child({ requestId });
    res.setHeader(REQUEST_ID_HEADER, requestId);
    next();
  };
}

export function accessLog(): RequestHandler {
  return (req, res, next) => {
    const startedAt = process.hrtime.bigint();

    res.on("finish", () => {
      const log = res.locals.log as Logger | undefined;
      log?.info(
        {
          method: req.method,
          path: req.originalUrl,
          status: res.statusCode,
          durationMs: Number(process.hrtime.bigint() - startedAt) / 1e6,
        },
        "request completed",
      );
    });

    next();
  };
}

export function notFound(): RequestHandler {
  return (_req, res) => {
    res.status(404).json({
      error: { code: "NOT_FOUND", message: "Route not found", requestId: getRequestId(res) },
    });
  };
}

/**
 * Every response uses the same envelope:
 * `{ error: { code, message, requestId, details? } }`.
 * Unexpected errors are logged with the request id but never echoed.
 */
export function errorHandler(logger: Logger): ErrorRequestHandler {
  return (error, req, res, next) => {
    const requestId = getRequestId(res);
    const log = (res.locals.log as Logger | undefined) ?? logger;

    if (res.headersSent) {
      next(error);
      return;
    }

    if (isAppError(error)) {
      if (error.status >= 500) {
        log.error({ err: error, method: req.method, path: req.originalUrl }, "request failed");
      } else {
        log.info(
          { code: error.code, status: error.status, method: req.method, path: req.originalUrl },
          "request rejected",
        );
      }

      if (error.code === "RATE_LIMITED" && isRetryDetails(error.details)) {
        res.setHeader("Retry-After", String(error.details.retryAfterSeconds));
      }

      res.status(error.status).json({
        error: {
          code: error.code,
          message: error.message,
          requestId,
          ...(error.details === undefined ? {} : { details: error.details }),
        },
      });
      return;
    }

    if (error instanceof ZodError) {
      res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Request validation failed",
          requestId,
          details: { fields: zodIssues(error) },
        },
      });
      return;
    }

    // Body parser failures (malformed JSON, payload too large).
    if (error instanceof SyntaxError && "body" in error) {
      res.status(400).json({
        error: { code: "VALIDATION_ERROR", message: "Malformed JSON body", requestId },
      });
      return;
    }

    log.error({ err: error, method: req.method, path: req.originalUrl }, "unhandled request error");

    res.status(500).json({
      error: { code: "INTERNAL", message: "Something went wrong", requestId },
    });
  };
}

function isRetryDetails(details: unknown): details is { retryAfterSeconds: number } {
  return (
    typeof details === "object" &&
    details !== null &&
    typeof (details as { retryAfterSeconds?: unknown }).retryAfterSeconds === "number"
  );
}
