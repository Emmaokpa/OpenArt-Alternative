import { prepareTestDatabase } from "./db.js";

/**
 * Vitest global setup. Creates the test database and applies migrations once
 * per run. When Postgres is unavailable the database-backed suites skip
 * themselves, so `pnpm test` still passes without Docker.
 */
export default async function globalSetup(): Promise<void> {
  await prepareTestDatabase();
}
