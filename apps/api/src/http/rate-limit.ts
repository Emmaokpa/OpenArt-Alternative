import type { NextFunction, Request, RequestHandler, Response } from "express";
import { rateLimited } from "../lib/errors.js";
import type { RateLimiter } from "../lib/rate-limit.js";

export interface RateLimitOptions {
  limiter: RateLimiter;
  /** Prefix that separates limits, e.g. "jobs:create". */
  scope: string;
  limit: number;
  windowSeconds: number;
  /** Defaults to the authenticated user's id, then the client IP. */
  key?: (req: Request, res: Response) => string | undefined;
}

export function rateLimit({
  limiter,
  scope,
  limit,
  windowSeconds,
  key,
}: RateLimitOptions): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const identity =
        key?.(req, res) ??
        (res.locals.auth as { user?: { id?: string } } | undefined)?.user?.id ??
        req.ip ??
        "unknown";

      const result = await limiter.hit(`${scope}:${identity}`, limit, windowSeconds);

      res.setHeader("X-RateLimit-Limit", String(limit));
      res.setHeader("X-RateLimit-Remaining", String(result.remaining));

      if (!result.allowed) {
        res.setHeader("Retry-After", String(result.retryAfterSeconds));
        next(rateLimited(result.retryAfterSeconds));
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
