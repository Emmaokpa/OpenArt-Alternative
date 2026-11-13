import { pino, type Logger } from "pino";
import type { Env } from "./env.js";

export type { Logger };

export function createLogger(env: Env): Logger {
  return pino({
    level: env.NODE_ENV === "test" ? "silent" : env.LOG_LEVEL,
    base: { service: "api", env: env.NODE_ENV },
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: {
      paths: [
        "req.headers.authorization",
        "req.headers.cookie",
        "res.headers.set-cookie",
        "*.authorization",
        "*.cookie",
        "*.password",
        "*.token",
        "env.DATABASE_URL",
        "env.REDIS_URL",
      ],
      censor: "[redacted]",
    },
  });
}
