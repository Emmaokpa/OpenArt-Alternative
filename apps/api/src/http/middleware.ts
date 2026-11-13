import { randomUUID } from "node:crypto";
import type { ErrorRequestHandler, RequestHandler, Response } from "express";
import type { Logger } from "../logger.js";

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
      error: { code: "not_found", message: "Route not found", requestId: getRequestId(res) },
    });
  };
}

export function errorHandler(logger: Logger): ErrorRequestHandler {
  return (error, req, res, next) => {
    const requestId = getRequestId(res);
    const log = (res.locals.log as Logger | undefined) ?? logger;
    log.error({ err: error, method: req.method, path: req.originalUrl }, "unhandled request error");

    if (res.headersSent) {
      next(error);
      return;
    }

    res.status(500).json({
      error: { code: "internal_error", message: "Something went wrong", requestId },
    });
  };
}
