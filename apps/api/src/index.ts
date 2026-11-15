import { createApp } from "./app.js";
import { createDatabase } from "./db/client.js";
import { loadEnv } from "./env.js";
import { createLogger } from "./logger.js";
import { createMailer } from "./lib/mailer.js";
import { createRateLimiter } from "./lib/rate-limit.js";
import { createStorage } from "./lib/storage.js";
import { createAuth } from "./modules/auth/auth.js";
import { createProviderRegistry } from "./providers/registry.js";
import { createQueues } from "./queue/queues.js";
import { checkRedis, createRedis } from "./redis.js";
import type { ApiContext } from "./routes/v1/context.js";
import { API_VERSION } from "./version.js";

const SHUTDOWN_TIMEOUT_MS = 10_000;

function main(): void {
  const env = loadEnv(process.env);
  const logger = createLogger(env);
  const { pool, db } = createDatabase(env.DATABASE_URL, logger, 10);
  const redis = createRedis(env.REDIS_URL, logger);

  const mailer = createMailer(env, logger);
  const auth = createAuth({ env, db, logger, mailer });
  const storage = createStorage(env, logger);
  const providers = createProviderRegistry(env, logger);
  const queues = createQueues(env, logger);
  const rateLimiter = createRateLimiter(redis, logger);

  const api: ApiContext = {
    env,
    logger,
    db,
    auth,
    storage,
    providers,
    queues,
    rateLimiter,
  };

  const app = createApp({
    env,
    logger,
    api,
    checks: {
      database: async () => {
        await pool.query("select 1");
      },
      redis: async () => {
        await checkRedis(env.REDIS_URL);
      },
    },
  });

  const server = app.listen(env.PORT, () => {
    logger.info(
      { port: env.PORT, version: API_VERSION, providerMode: env.PROVIDER_MODE },
      "api listening",
    );
  });

  let shuttingDown = false;

  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, "shutting down");

    const forceExit = setTimeout(() => {
      logger.error("shutdown timed out, exiting hard");
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);
    forceExit.unref();

    server.close();
    await queues.close().catch((error: unknown) => {
      logger.warn({ err: error }, "could not close queues");
    });
    redis.disconnect();
    await pool.end().catch(() => undefined);
    process.exit(0);
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

try {
  main();
} catch (error) {
  // Startup errors (invalid env, port in use) must be readable in the platform
  // logs without the logger, which may not exist yet.
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
}
