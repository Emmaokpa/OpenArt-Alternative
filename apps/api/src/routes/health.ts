import { Router } from "express";
import type { Logger } from "../logger.js";
import { withTimeout } from "../lib/with-timeout.js";
import { API_VERSION } from "../version.js";

export interface HealthChecks {
  database: () => Promise<unknown>;
  redis: () => Promise<unknown>;
}

export interface HealthRouterOptions {
  checks: HealthChecks;
  logger: Logger;
  timeoutMs?: number;
}

export const DEFAULT_CHECK_TIMEOUT_MS = 2_000;

type CheckResult = { ok: true } | { ok: false; error: string };

async function runCheck(check: () => Promise<unknown>, timeoutMs: number): Promise<CheckResult> {
  try {
    await withTimeout(check(), timeoutMs, "health check timed out");
    return { ok: true };
  } catch (error) {
    if (error instanceof Error) {
      return { ok: false, error: error.message || error.name };
    }
    return { ok: false, error: "unknown error" };
  }
}

/**
 * GET /healthz is what Coolify, Uptime Kuma and the load balancer hit. It
 * returns 503 when a dependency is down, so a broken deploy never receives
 * traffic. Failure details go to the log, not the response.
 */
export function createHealthRouter({
  checks,
  logger,
  timeoutMs = DEFAULT_CHECK_TIMEOUT_MS,
}: HealthRouterOptions): Router {
  const router = Router();

  router.get("/healthz", async (_req, res) => {
    const [database, redis] = await Promise.all([
      runCheck(checks.database, timeoutMs),
      runCheck(checks.redis, timeoutMs),
    ]);
    const ok = database.ok && redis.ok;

    if (!ok) {
      const log = (res.locals.log as Logger | undefined) ?? logger;
      log.warn(
        {
          database: database.ok ? "ok" : database.error,
          redis: redis.ok ? "ok" : redis.error,
        },
        "health check failed",
      );
    }

    res.status(ok ? 200 : 503).json({
      status: ok ? "ok" : "error",
      checks: {
        database: database.ok ? "ok" : "error",
        redis: redis.ok ? "ok" : "error",
      },
      version: API_VERSION,
      uptimeSeconds: Math.round(process.uptime()),
    });
  });

  return router;
}
