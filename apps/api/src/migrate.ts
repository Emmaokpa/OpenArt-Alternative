import { fileURLToPath } from "node:url";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { createDatabase } from "./db/client.js";
import { loadEnv } from "./env.js";

/**
 * Applies pending migrations. Runs as a one-off command during deploy
 * (`pnpm --filter @app/api db:migrate:prod`), not on every boot, so a rolling
 * restart never races two migration runs.
 */
async function main(): Promise<void> {
  const env = loadEnv(process.env);
  const { pool, db } = createDatabase(env.DATABASE_URL);

  try {
    await migrate(db, {
      migrationsFolder: fileURLToPath(new URL("../drizzle", import.meta.url)),
    });
    process.stderr.write("migrations applied\n");
  } finally {
    await pool.end();
  }
}

try {
  await main();
} catch (error) {
  process.stderr.write(
    `migration failed: ${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exit(1);
}
