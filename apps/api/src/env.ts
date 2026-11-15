import { z } from "zod";

const LOG_LEVELS = ["fatal", "error", "warn", "info", "debug", "trace", "silent"] as const;

function connectionUrl(protocols: readonly string[], label: string) {
  return z
    .string()
    .refine((value) => protocols.some((protocol) => value.startsWith(`${protocol}://`)), {
      message: `${label} must start with ${protocols.map((protocol) => `${protocol}://`).join(" or ")}`,
    });
}

function csv(transform: (values: string[]) => string[] = (values) => values) {
  return z
    .string()
    .default("")
    .transform((raw) =>
      raw
        .split(",")
        .map((value) => value.trim())
        .filter((value) => value.length > 0),
    )
    .pipe(z.array(z.string()))
    .transform(transform);
}

const DEV_AUTH_SECRET = "dev-only-auth-secret-change-me-at-least-32-chars";

export const envSchema = z
  .object({
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

    // --- Auth -------------------------------------------------------------
    // Optional in development so `pnpm dev` works from a fresh checkout; the
    // production refinement below makes it mandatory there.
    BETTER_AUTH_SECRET: z.string().min(32).optional(),
    BETTER_AUTH_URL: z.url().default("http://localhost:8080"),
    APP_URL: z.url().default("http://localhost:3000"),
    // Both or neither; checked below.
    GOOGLE_CLIENT_ID: z.string().min(1).optional(),
    GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
    RESEND_API_KEY: z.string().min(1).optional(),
    EMAIL_FROM: z.string().min(3).default("OpenArt <no-reply@example.com>"),
    TURNSTILE_SECRET_KEY: z.string().min(1).optional(),
    // Comma-separated emails promoted to the admin role on signup.
    ADMIN_EMAILS: csv((values) => values.map((value) => value.toLowerCase())),

    // Development convenience only; production is forced to zero.
    SIGNUP_GRANT_CREDITS: z.coerce.number().int().min(0).max(100_000).default(0),

    // --- Storage (R2 in production, LocalStack S3 locally) ------------------
    S3_ENDPOINT: z.url().default("http://localhost:4566"),
    S3_REGION: z.string().min(1).default("us-east-1"),
    S3_ACCESS_KEY_ID: z.string().min(1).optional(),
    S3_SECRET_ACCESS_KEY: z.string().min(1).optional(),
    S3_BUCKET_PRIVATE: z.string().min(1).default("app-private"),
    S3_BUCKET_PUBLIC: z.string().min(1).default("app-public"),
    S3_FORCE_PATH_STYLE: z
      .enum(["true", "false"])
      .default("true")
      .transform((value) => value === "true"),

    // --- Fake provider ------------------------------------------------------
    FAKE_DELAY_MS: z.coerce.number().int().min(0).max(120_000).default(1_500),
    FAKE_FAIL_RATE: z.coerce.number().min(0).max(1).default(0),
    FAKE_TIMEOUT_RATE: z.coerce.number().min(0).max(1).default(0),

    // --- fal.ai (real provider) ---------------------------------------------
    FAL_KEY: z.string().min(1).optional(),
    FAL_BASE_URL: z.url().default("https://fal.run"),
    // Optional shared secret for verifying fal.ai webhook signatures.
    FAL_WEBHOOK_SECRET: z.string().min(1).optional(),

    // --- AssemblyAI (speech-to-text) ----------------------------------------
    ASSEMBLYAI_API_KEY: z.string().min(1).optional(),
    ASSEMBLYAI_BASE_URL: z.url().default("https://api.assemblyai.com"),

    // --- Spend limits -------------------------------------------------------
    // Global daily spend cap in micro-dollars. 0 = unlimited.
    DAILY_SPEND_CAP_USD_MICROS: z.coerce.number().int().min(0).default(0),
    // Max concurrent jobs per user. 0 = unlimited.
    MAX_CONCURRENT_JOBS_PER_USER: z.coerce.number().int().min(0).default(0),

    // --- Job polling --------------------------------------------------------
    // A waiting job is re-enqueued with a delay instead of sleeping in a worker.
    JOB_POLL_INTERVAL_MS: z.coerce.number().int().min(10).max(60_000).default(3_000),
    JOB_POLL_MAX_MS: z.coerce.number().int().min(10).max(300_000).default(30_000),
  })
  .superRefine((env, ctx) => {
    const both = Boolean(env.GOOGLE_CLIENT_ID) === Boolean(env.GOOGLE_CLIENT_SECRET);
    if (!both) {
      ctx.addIssue({
        code: "custom",
        path: ["GOOGLE_CLIENT_ID"],
        message: "GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set together",
      });
    }

    if (env.NODE_ENV !== "production") return;

    const required: Array<[keyof typeof env, string]> = [
      ["BETTER_AUTH_SECRET", "BETTER_AUTH_SECRET is required in production"],
      ["RESEND_API_KEY", "RESEND_API_KEY is required in production (email verification)"],
      ["TURNSTILE_SECRET_KEY", "TURNSTILE_SECRET_KEY is required in production"],
      ["S3_ACCESS_KEY_ID", "S3_ACCESS_KEY_ID is required in production"],
      ["S3_SECRET_ACCESS_KEY", "S3_SECRET_ACCESS_KEY is required in production"],
    ];

    // Real provider mode requires a fal.ai key.
    if (env.PROVIDER_MODE === "real") {
      required.push(["FAL_KEY", "FAL_KEY is required when PROVIDER_MODE=real"]);
    }

    for (const [key, message] of required) {
      if (!env[key]) ctx.addIssue({ code: "custom", path: [key], message });
    }

    if (env.SIGNUP_GRANT_CREDITS !== 0) {
      ctx.addIssue({
        code: "custom",
        path: ["SIGNUP_GRANT_CREDITS"],
        message: "SIGNUP_GRANT_CREDITS must be 0 in production",
      });
    }
  });

export type Env = Omit<z.infer<typeof envSchema>, "BETTER_AUTH_SECRET"> & {
  BETTER_AUTH_SECRET: string;
};

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

  // Development and test get a stable throwaway secret so cookies survive a
  // restart; production was already forced to provide a real one above.
  return {
    ...result.data,
    BETTER_AUTH_SECRET: result.data.BETTER_AUTH_SECRET ?? DEV_AUTH_SECRET,
  };
}
