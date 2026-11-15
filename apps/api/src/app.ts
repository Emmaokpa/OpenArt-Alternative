import cors from "cors";
import express, { type Express } from "express";
import { toNodeHandler } from "better-auth/node";
import type { Env } from "./env.js";
import { accessLog, errorHandler, notFound, requestContext } from "./http/middleware.js";
import type { Logger } from "./logger.js";
import { createHealthRouter, type HealthRouterOptions } from "./routes/health.js";
import { createV1Router, type ApiContext } from "./routes/v1/index.js";
import { API_VERSION } from "./version.js";

export interface AppDependencies {
  env: Env;
  logger: Logger;
  checks: HealthRouterOptions["checks"];
  healthTimeoutMs?: number;
  /** Omitted by tests that only exercise health and the error envelope. */
  api?: ApiContext;
}

export function createApp({ env, logger, checks, healthTimeoutMs, api }: AppDependencies): Express {
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

  // Better Auth needs the raw request stream, so it is mounted before any body
  // parser (see its Express integration guide).
  if (api) {
    app.all("/api/auth/{*any}", toNodeHandler(api.auth));
  }

  app.use(
    express.json({
      limit: "1mb",
      // Capture the raw body so webhook routes can verify provider signatures.
      verify: (req: unknown, _res: unknown, buf: Buffer) => {
        (req as { rawBody?: string }).rawBody = buf.toString("utf8");
      },
    }),
  );

  app.get("/", (_req, res) => {
    res.json({ name: "api", version: API_VERSION });
  });

  app.use(createHealthRouter({ checks, logger, timeoutMs: healthTimeoutMs }));

  if (api) {
    app.use("/v1", createV1Router(api));
  }

  app.use(notFound());
  app.use(errorHandler(logger));

  return app;
}
