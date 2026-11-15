import type { Redis } from "ioredis";
import type { Logger } from "../logger.js";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export interface RateLimiter {
  hit(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult>;
}

/**
 * Fixed-window counter in Redis. Two commands in one pipeline keep the count
 * and the expiry together, so a crash between them cannot leave a key that
 * never expires.
 *
 * If Redis is unavailable the limiter fails open and logs: availability of the
 * product matters more than a temporary loss of throttling, and the queue
 * still protects provider spend.
 */
export function createRateLimiter(redis: Redis, logger: Logger): RateLimiter {
  return {
    async hit(key, limit, windowSeconds) {
      try {
        const results = await redis
          .multi()
          .incr(key)
          .expire(key, windowSeconds, "NX")
          .exec();

        const increment = results?.[0]?.[1];
        const count = typeof increment === "number" ? increment : Number(increment ?? 0);

        if (!Number.isFinite(count)) {
          return { allowed: true, remaining: limit, retryAfterSeconds: 0 };
        }

        return {
          allowed: count <= limit,
          remaining: Math.max(0, limit - count),
          retryAfterSeconds: count > limit ? windowSeconds : 0,
        };
      } catch (error) {
        logger.warn({ err: error, key }, "rate limiter unavailable, allowing request");
        return { allowed: true, remaining: limit, retryAfterSeconds: 0 };
      }
    },
  };
}
