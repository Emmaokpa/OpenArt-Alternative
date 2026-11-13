import { z } from "zod";

const LOG_LEVELS = ["fatal", "error", "warn", "info", "debug", "trace", "silent"] as const;

function connectionUrl(protocols: readonly string[], label: string) {
  return z
    .string()
    .refine((value) => protocols.some((protocol) => value.startsWith(`${protocol}://`)), {
      message: `${label} must start with ${protocols.map((protocol) => `${protocol}://`).join(" or ")}`,
    });
}

export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(8080),
  LOG_LEVEL: z.enum(LOG_LEVELS).default("info"),
  DATABASE_URL: connectionUrl(["postgres", "postgresql"], "DATABASE_URL"),
  REDIS_URL: connectionUrl(["redis", "rediss"], "REDIS_URL"),
  CORS_ORIGINS: z
    .string()
    .default("http://localhost:3000")
    .transform((raw) =>
      raw
        .split(",")
        .map((origin) => origin.trim())
        .filter((origin) => origin.length > 0),
    )
    .pipe(z.array(z.url())),
  // Every provider call goes through an adapter; development stays on "fake".
  PROVIDER_MODE: z.enum(["fake", "real"]).default("fake"),
});

export type Env = z.infer<typeof envSchema>;

export class EnvValidationError extends Error {
  readonly issues: readonly string[];

  constructor(issues: readonly string[]) {
    super(`Invalid environment configuration:\n${issues.join("\n")}`);
    this.name = "EnvValidationError";
    this.issues = issues;
  }
}

/**
 * Validates the process environment. Failures report field names and reasons
 * only, never the submitted values, because those are usually secrets.
 */
export function loadEnv(source: Record<string, string | undefined> = process.env): Env {
  const result = envSchema.safeParse(source);

  if (!result.success) {
    const issues = result.error.issues.map((issue) => {
      const path = issue.path.join(".") || "(root)";
      return `  ${path}: ${issue.message}`;
    });
    throw new EnvValidationError(issues);
  }

  return result.data;
}
