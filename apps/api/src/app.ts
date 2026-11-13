import cors from "cors";
import express, { type Express } from "express";
import type { Env } from "./env.js";
import { accessLog, errorHandler, notFound, requestContext } from "./http/middleware.js";
import type { Logger } from "./logger.js";
import { createHealthRouter, type HealthRouterOptions } from "./routes/health.js";
import { API_VERSION } from "./version.js";

export interface AppDependencies {
  env: Env;
  logger: Logger;
  checks: HealthRouterOptions["checks"];
  healthTimeoutMs?: number;
}

export function createApp({ env, logger, checks, healthTimeoutMs }: AppDependencies): Express {
  const app = express();

  app.disable("x-powered-by");
  // Coolify's proxy (and Cloudflare in front of it) terminates TLS.
  app.set("trust proxy", 1);

  app.use(requestContext(logger));
  app.use(accessLog());
  app.use(
    cors({
      origin: env.CORS_ORIGINS,
      credentials: true,
      maxAge: 86_400,
    }),
  );
  app.use(express.json({ limit: "1mb" }));

  app.get("/", (_req, res) => {
    res.json({ name: "api", version: API_VERSION });
  });

  app.use(createHealthRouter({ checks, logger, timeoutMs: healthTimeoutMs }));

  app.use(notFound());
  app.use(errorHandler(logger));

  return app;
}
