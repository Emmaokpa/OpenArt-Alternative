import { Redis } from "ioredis";

/**
 * Opens a short-lived connection, pings it and always closes it. A long-lived
 * client would retry in the background and flood the logs with errors every
 * few seconds whenever Redis is down; the health check reports what it finds
 * and leaves reconnection to the next probe.
 *
 * Phase 1 adds the long-lived clients BullMQ needs.
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
