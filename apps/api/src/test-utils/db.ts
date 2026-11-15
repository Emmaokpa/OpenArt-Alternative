import { Client } from "pg";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { fileURLToPath } from "node:url";
import { createDatabase, type Db } from "../db/client.js";

/**
 * Integration tests run against a separate database so `pnpm test` can never
 * erase a developer's seeded development data. `TEST_DATABASE_URL` wins; next
 * the DATABASE_URL database with `_test` appended; last a local default.
 */
export function testDatabaseUrl(): string {
  const explicit = process.env.TEST_DATABASE_URL;
  if (explicit) return explicit;

  const base = process.env.DATABASE_URL ?? "postgres://app:app@localhost:5432/app";
  const url = new URL(base);
  const database = url.pathname.replace(/^\//, "") || "app";
  url.pathname = `/${database}_test`;
  return url.toString();
}

const MIGRATIONS_FOLDER = fileURLToPath(new URL("../../drizzle", import.meta.url));

/**
 * Creates the test database when it is missing and applies migrations. Used
 * by the Vitest global setup; returns false when Postgres is unreachable so
 * the suite can skip integration tests instead of failing on a laptop.
 */
export async function prepareTestDatabase(): Promise<boolean> {
  const target = testDatabaseUrl();

  try {
    await ensureDatabaseExists(target);
  } catch (error) {
    process.stderr.write(
      `integration tests skipped: cannot reach postgres (${error instanceof Error ? error.message : String(error)})\n`,
    );
    return false;
  }

  const { pool, db } = createDatabase(target, undefined, 2);
  try {
    await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
    return true;
  } finally {
    await pool.end();
  }
}

async function ensureDatabaseExists(target: string): Promise<void> {
  const url = new URL(target);
  const database = decodeURIComponent(url.pathname.replace(/^\//, ""));
  if (!database) throw new Error("test database url has no database name");

  const maintenance = new URL(target);
  maintenance.pathname = "/postgres";

  const client = new Client({ connectionString: maintenance.toString() });
  await client.connect();
  try {
    const existing = await client.query("select 1 from pg_database where datname = $1", [database]);
    if (existing.rowCount === 0) {
      // Database names cannot be parameterised; escape quotes defensively.
      const quoted = `"${database.replace(/"/g, '""')}"`;
      await client.query(`create database ${quoted}`);
    }
  } finally {
    await client.end();
  }
}

/** Connects to the prepared test database. Caller closes the pool. */
export function openTestDatabase() {
  return createDatabase(testDatabaseUrl(), undefined, 4);
}

/** True when the test database exists and accepts queries. */
export async function testDatabaseAvailable(): Promise<boolean> {
  const { pool } = createDatabase(testDatabaseUrl(), undefined, 1);
  try {
    await pool.query("select 1");
    return true;
  } catch {
    return false;
  } finally {
    await pool.end();
  }
}

/**
 * Empties every application table between tests. Order is irrelevant because
 * CASCADE is used, but the list is explicit so a new table is never forgotten.
 */
export async function resetDatabase(db: Db): Promise<void> {
  await db.execute(`
    truncate table
      webhook_events,
      moderation_events,
      audit_log,
      credit_ledger,
      credit_accounts,
      job_steps,
      assets,
      jobs,
      templates,
      models,
      subscriptions,
      payments,
      profiles,
      verification,
      session,
      account,
      "user",
      plans
    restart identity cascade
  `);
}
