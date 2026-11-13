import { describe, expect, it } from "vitest";
import { EnvValidationError, loadEnv } from "./env.js";

const validSource = {
  DATABASE_URL: "postgres://app:app@localhost:5432/app",
  REDIS_URL: "redis://localhost:6379",
};

describe("loadEnv", () => {
  it("applies safe development defaults", () => {
    const env = loadEnv(validSource);

    expect(env.NODE_ENV).toBe("development");
    expect(env.PORT).toBe(8080);
    expect(env.LOG_LEVEL).toBe("info");
    expect(env.PROVIDER_MODE).toBe("fake");
    expect(env.CORS_ORIGINS).toEqual(["http://localhost:3000"]);
  });

  it("coerces PORT and parses multiple CORS origins", () => {
    const env = loadEnv({
      ...validSource,
      PORT: "3001",
      CORS_ORIGINS: "http://localhost:3000, https://app.example.com ,",
    });

    expect(env.PORT).toBe(3001);
    expect(env.CORS_ORIGINS).toEqual(["http://localhost:3000", "https://app.example.com"]);
  });

  it("rejects a missing database url", () => {
    expect(() => loadEnv({ REDIS_URL: validSource.REDIS_URL })).toThrow(EnvValidationError);
    expect(() => loadEnv({ REDIS_URL: validSource.REDIS_URL })).toThrow(/DATABASE_URL/);
  });

  it("rejects urls with the wrong scheme", () => {
    expect(() => loadEnv({ ...validSource, DATABASE_URL: "mysql://localhost:3306/app" })).toThrow(
      /DATABASE_URL must start with postgres:\/\/ or postgresql:\/\//,
    );
  });

  it("rejects an invalid PORT without echoing other values", () => {
    expect(() => loadEnv({ ...validSource, PORT: "not-a-port" })).toThrow(/PORT/);
  });

  it("never includes secret values in the error message", () => {
    const secretValue = "mysql://user:super-secret-token@host/db";

    try {
      loadEnv({ ...validSource, DATABASE_URL: secretValue });
      expect.unreachable("expected loadEnv to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(EnvValidationError);
      expect(String(error)).not.toContain("super-secret-token");
    }
  });

  it("requires real mode to be chosen explicitly", () => {
    expect(loadEnv({ ...validSource, PROVIDER_MODE: "real" }).PROVIDER_MODE).toBe("real");
    expect(() => loadEnv({ ...validSource, PROVIDER_MODE: "live" })).toThrow(/PROVIDER_MODE/);
  });
});
