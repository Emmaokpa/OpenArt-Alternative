import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Local development keeps a single .env in the repo root. Real deployments pass
// DATABASE_URL from the platform's environment, which dotenv never overrides.
config({ path: fileURLToPath(new URL("../../.env", import.meta.url)), quiet: true });

export default defineConfig({
  schema: "./src/db/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  // `generate` never connects, so a placeholder keeps it usable on a fresh
  // checkout; `migrate` and `studio` fail loudly if the URL is missing.
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://localhost:5432/missing_database_url",
  },
  strict: true,
  verbose: true,
});
