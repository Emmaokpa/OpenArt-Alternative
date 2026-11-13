import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import type { Logger } from "../logger.js";
import * as schema from "./schema/index.js";

export type Db = ReturnType<typeof createDatabase>["db"];

export function createDatabase(databaseUrl: string, logger?: Pick<Logger, "error">) {
  const pool = new Pool({
    connectionString: databaseUrl,
    // Connection pool size from the database plan (API 10, worker-io 5, worker-media 3).
    max: 10,
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 30_000,
  });

  // An idle client erroring must not crash the process; the pool replaces it.
  pool.on("error", (error: Error) => {
    logger?.error({ err: error }, "unexpected postgres pool error");
  });

  return { pool, db: drizzle(pool, { schema }) };
}
