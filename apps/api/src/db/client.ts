import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import type { Logger } from "../logger.js";
import * as schema from "./schema/index.js";

export type Db = ReturnType<typeof createDatabase>["db"];
/** The object passed to `db.transaction(async (tx) => ...)`. */
export type DbTransaction = Parameters<Parameters<Db["transaction"]>[0]>[0];
/** Anything that can run the same queries: the pool-backed db or a transaction. */
export type DbExecutor = Db | DbTransaction;

export function createDatabase(
  databaseUrl: string,
  logger?: Pick<Logger, "error">,
  maxConnections = 10,
) {
  const pool = new Pool({
    connectionString: databaseUrl,
    // Connection pool size from the database plan (API 10, worker-io 5, worker-media 3).
    max: maxConnections,
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 30_000,
  });

  // An idle client erroring must not crash the process; the pool replaces it.
  pool.on("error", (error: Error) => {
    logger?.error({ err: error }, "unexpected postgres pool error");
  });

  return { pool, db: drizzle(pool, { schema }) };
}
