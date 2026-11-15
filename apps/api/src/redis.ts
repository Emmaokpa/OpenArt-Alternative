import { Redis } from "ioredis";
import type { Logger } from "./logger.js";

/**
 * Opens a short-lived connection, pings it and always closes it. A long-lived
 * client would retry in the background and flood the logs with errors every
 * few seconds whenever Redis is down; the health check reports what it finds
 * and leaves reconnection to the next probe.
 *
 * Long-running processes (API, workers) use `createRedis` below instead.
 */
export async function checkRedis(redisUrl: string, connectTimeoutMs = 2_000): Promise<void> {
  const redis = new Redis(redisUrl, {
    lazyConnect: true,
    connectTimeout: connectTimeoutMs,
    // Health checks must fail fast instead of queueing commands.
    enableOfflineQueue: false,
    maxRetriesPerRequest: 0,
    retryStrategy: () => null,
  });

  // Errors are reported by the check itself; ioredis requires a listener.
  redis.on("error", () => undefined);

  try {
    await redis.connect();
    await redis.ping();
  } finally {
    redis.disconnect();
  }
}

/** Long-lived Redis client used by rate limits, locks and BullMQ producers. */
export function createRedis(redisUrl: string, logger: Logger): Redis {
  const redis = new Redis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    retryStrategy: (attempt) => Math.min(attempt * 500, 5_000),
  });

  redis.on("error", (error: Error) => {
    logger.error({ err: error }, "redis connection error");
  });

  return redis;
}

/** BullMQ connection options derived from the URL. */
export function redisConnectionOptions(redisUrl: string) {
  const url = new URL(redisUrl);
  const dbPath = url.pathname.replace(/^\//, "");
  return {
    host: url.hostname,
    port: url.port ? Number(url.port) : 6379,
    username: url.username || undefined,
    password: url.password || undefined,
    db: dbPath ? Number(dbPath) : undefined,
    ...(url.protocol === "rediss:" ? { tls: {} } : {}),
  };
}
