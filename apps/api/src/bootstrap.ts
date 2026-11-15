import type { Redis } from "ioredis";
import type { Db } from "./db/client.js";
import { createDatabase } from "./db/client.js";
import type { Env } from "./env.js";
import { loadEnv } from "./env.js";
import { createMailer } from "./lib/mailer.js";
import { createStorage, type Storage } from "./lib/storage.js";
import { createLogger, type Logger } from "./logger.js";
import { createProviderRegistry, type ProviderRegistry } from "./providers/registry.js";
import { createQueues, type Queues } from "./queue/queues.js";
import { createRedis } from "./redis.js";

export interface WorkerRuntime {
  env: Env;
  logger: Logger;
  db: Db;
  redis: Redis;
  storage: Storage;
  providers: ProviderRegistry;
  queues: Queues;
  pool: { end(): Promise<void> };
  mailer: ReturnType<typeof createMailer>;
}

/** Shared bootstrap for worker-io and worker-media (smaller DB pools). */
export function createWorkerRuntime(options: { poolSize: number }): WorkerRuntime {
  const env = loadEnv(process.env);
  const logger = createLogger(env);
  const { pool, db } = createDatabase(env.DATABASE_URL, logger, options.poolSize);
  const redis = createRedis(env.REDIS_URL, logger);

  return {
    env,
    logger,
    db,
    redis,
    storage: createStorage(env, logger),
    providers: createProviderRegistry(env, logger),
    queues: createQueues(env, logger),
    pool,
    mailer: createMailer(env, logger),
  };
}

/**
 * Closes workers and dependencies exactly once. Worker close waits for active
 * jobs so a deploy never leaves a half-written step behind.
 */
export function installShutdown(
  logger: Logger,
  runtime: WorkerRuntime,
  closeWorkers: () => Promise<void>,
): void {
  let shuttingDown = false;

  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, "worker shutting down");

    const forceExit = setTimeout(() => {
      logger.error("worker shutdown timed out, exiting hard");
      process.exit(1);
    }, 15_000);
    forceExit.unref();

    try {
      await closeWorkers();
      await runtime.queues.close();
      runtime.redis.disconnect();
      await runtime.pool.end();
    } finally {
      process.exit(0);
    }
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));

  process.on("unhandledRejection", (reason) => {
    logger.error({ err: reason }, "unhandled promise rejection");
  });

  process.on("uncaughtException", (error) => {
    logger.fatal({ err: error }, "uncaught exception");
    process.exit(1);
  });
}
