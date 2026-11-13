import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { loadEnv } from "../env.js";
import { createLogger } from "../logger.js";
import type { HealthChecks } from "./health.js";

const env = loadEnv({
  DATABASE_URL: "postgres://app:app@localhost:5432/app",
  REDIS_URL: "redis://localhost:6379",
  NODE_ENV: "test",
});
const logger = createLogger(env);

function buildApp(checks: Partial<HealthChecks> = {}, healthTimeoutMs?: number) {
  return createApp({
    env,
    logger,
    checks: {
      database: async () => undefined,
      redis: async () => undefined,
      ...checks,
    },
    healthTimeoutMs,
  });
}

describe("GET /healthz", () => {
  it("returns 200 when postgres and redis respond", async () => {
    const response = await request(buildApp()).get("/healthz");

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      status: "ok",
      checks: { database: "ok", redis: "ok" },
    });
    expect(response.body.version).toBeTypeOf("string");
    expect(response.headers["x-request-id"]).toBeTruthy();
  });

  it("returns 503 when redis is unreachable", async () => {
    const response = await request(
      buildApp({
        redis: async () => {
          throw new Error("connect ECONNREFUSED 127.0.0.1:6379");
        },
      }),
    ).get("/healthz");

    expect(response.status).toBe(503);
    expect(response.body).toMatchObject({
      status: "error",
      checks: { database: "ok", redis: "error" },
    });
    expect(JSON.stringify(response.body)).not.toContain("ECONNREFUSED");
  });

  it("returns 503 when a dependency hangs past the timeout", async () => {
    const response = await request(
      buildApp(
        {
          database: () => new Promise<never>(() => undefined),
        },
        25,
      ),
    ).get("/healthz");

    expect(response.status).toBe(503);
    expect(response.body).toMatchObject({
      status: "error",
      checks: { database: "error", redis: "ok" },
    });
  });
});

describe("unknown routes", () => {
  it("returns the stable error envelope", async () => {
    const response = await request(buildApp()).get("/does-not-exist");

    expect(response.status).toBe(404);
    expect(response.body.error).toMatchObject({ code: "not_found" });
    expect(response.body.error.requestId).toBeTypeOf("string");
  });
});
