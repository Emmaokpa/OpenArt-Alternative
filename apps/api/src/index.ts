import { createApp } from "./app.js";
import { createDatabase } from "./db/client.js";
import { loadEnv } from "./env.js";
import { createLogger } from "./logger.js";
import { checkRedis } from "./redis.js";
import { API_VERSION } from "./version.js";

const SHUTDOWN_TIMEOUT_MS = 10_000;

function main(): void {
  const env = loadEnv(process.env);
  const logger = createLogger(env);
  const { pool } = createDatabase(env.DATABASE_URL, logger);

  const app = createApp({
    env,
    logger,
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
    await pool.end();
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
